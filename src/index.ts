#!/usr/bin/env node

/**
 * API易 MCP Server
 * @description 基于 Gemini API 的多模态内容生成服务器
 * @see https://docs.apiyi.com/api-capabilities/gemini-native-format
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleGenAI } from '@google/genai';

import type {
  ServerConfig,
  GenerateContentArgs,
  CodeBlock,
  CodeExecutionResult,
  RequestConfig,
  FullRequestConfig,
  MessageContent,
  GenerateContentBatchArgs,
  BatchRequestItem,
  BatchResultItem,
  BatchGenerateResponse,
} from './types.js';

import {
  SERVER_NAME,
  SERVER_VERSION,
  TOOL_NAMES,
  TEMPERATURE_RANGE,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  CONCURRENCY_CONFIG,
  createConfigFromEnvironment,
} from './constants.js';

import {
  getApiKey,
  processFiles,
  buildMessageParts,
  formatCodeBlocks,
  formatExecutionResults,
  formatFileErrors,
  normalizeMediaResolution,
  logServerConfig,
} from './utils.js';

/**
 * API易 MCP 服务器类
 * @description 处理 Gemini API 的多模态内容生成请求
 */
class ApiyiMcpServer {
  private readonly server: Server;
  private readonly config: ServerConfig;
  private genAI: GoogleGenAI | null = null;

  constructor() {
    this.config = createConfigFromEnvironment();
    this.server = this.createServer();
    this.setupToolHandlers();
    this.initializeGenAI();
  }

  /**
   * 创建 MCP 服务器实例
   */
  private createServer(): Server {
    return new Server(
      { name: SERVER_NAME, version: SERVER_VERSION },
      { capabilities: { tools: {} } }
    );
  }

  /**
   * 初始化 Google GenAI 客户端
   */
  private initializeGenAI(): void {
    try {
      const apiKey = getApiKey();
      
      this.genAI = new GoogleGenAI({
        apiKey,
        httpOptions: { baseUrl: this.config.baseUrl },
      });

      logServerConfig(this.config);
    } catch (error) {
      console.error(LOG_MESSAGES.INIT_FAILED(error));
      process.exit(1);
    }
  }

  /**
   * 设置工具处理器
   */
  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, () => this.handleListTools());
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const { name, arguments: args = {} } = request.params;
      return await this.handleCallTool(name, args);
    });
  }

  /**
   * 处理工具列表请求
   */
  private handleListTools() {
    return {
      tools: [
        this.createGenerateContentTool(),
        this.createGenerateContentBatchTool(),
      ],
    };
  }

  /**
   * 创建 generate_content 工具定义
   */
  private createGenerateContentTool() {
    return {
      name: TOOL_NAMES.GENERATE_CONTENT,
      description: this.getToolDescription(),
      inputSchema: this.getToolInputSchema(),
    };
  }

  /**
   * 获取工具描述
   */
  private getToolDescription(): string {
    return `Generate content using Gemini with optional file inputs, code execution, and Google search. Supports multiple files: images (JPG, PNG, GIF, WebP, SVG, BMP, TIFF), video (MP4, AVI, MOV, WebM, FLV, MPG, WMV), audio (MP3, WAV, AIFF, AAC, OGG, FLAC), documents (PDF), and text files (TXT, MD, JSON, XML, CSV, HTML). MIME type is auto-detected from file extension.

Example usage:
\`\`\`json
{
  "user_prompt": "Analyze this video",
  "files": [{"path": "/path/to/video.mp4"}]
}
\`\`\`

PDF to Markdown conversion:
\`\`\`json
{
  "user_prompt": "Convert this PDF to well-formatted Markdown",
  "files": [{"path": "/document.pdf"}]
}
\`\`\`

With Google Search:
\`\`\`json
{
  "user_prompt": "What are the latest AI breakthroughs in 2024?",
  "enable_google_search": true
}
\`\`\`

With Code Execution:
\`\`\`json
{
  "user_prompt": "Write and run a Python script to calculate prime numbers",
  "enable_code_execution": true
}
\`\`\`

Media Resolution Optimization (save tokens):
\`\`\`json
{
  "user_prompt": "Describe this image",
  "files": [{"path": "/image.jpg"}],
  "media_resolution": "LOW"
}
\`\`\``;
  }

  /**
   * 获取工具输入模式
   */
  private getToolInputSchema() {
    return {
      type: 'object',
      properties: {
        user_prompt: {
          type: 'string',
          description: 'User prompt for generation',
        },
        system_prompt: {
          type: 'string',
          description: 'System prompt to guide the AI behavior (optional)',
        },
        files: {
          type: 'array',
          description: 'Array of files to include in generation (optional)',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to file' },
              content: { type: 'string', description: 'Base64 encoded file content' },
              type: { type: 'string', description: 'MIME type (auto-detected if omitted)' },
            },
            oneOf: [{ required: ['path'] }, { required: ['content'] }],
          },
          maxItems: this.config.maxFiles,
        },
        model: {
          type: 'string',
          description: 'Gemini model to use',
          default: this.config.defaultModel,
        },
        temperature: {
          type: 'number',
          description: `Temperature (${TEMPERATURE_RANGE.MIN}-${TEMPERATURE_RANGE.MAX})`,
          default: this.config.defaultTemperature,
          minimum: TEMPERATURE_RANGE.MIN,
          maximum: TEMPERATURE_RANGE.MAX,
        },
        enable_code_execution: {
          type: 'boolean',
          description: 'Enable code execution capability',
          default: false,
        },
        enable_google_search: {
          type: 'boolean',
          description: 'Enable Google search capability',
          default: false,
        },
        thinking_budget: {
          type: 'number',
          description: 'Thinking budget for supported models (-1 for unlimited)',
          default: -1,
        },
        media_resolution: {
          type: 'string',
          description: 'Media resolution: LOW (saves tokens), MEDIUM, HIGH',
          enum: ['LOW', 'MEDIUM', 'HIGH'],
          default: this.config.defaultMediaResolution,
        },
      },
      required: ['user_prompt'],
    };
  }

  /**
   * 创建 generate_content_batch 批量并发工具定义
   */
  private createGenerateContentBatchTool() {
    return {
      name: TOOL_NAMES.GENERATE_CONTENT_BATCH,
      description: this.getBatchToolDescription(),
      inputSchema: this.getBatchToolInputSchema(),
    };
  }

  /**
   * 获取批量工具描述
   */
  private getBatchToolDescription(): string {
    return `Generate multiple contents concurrently using Gemini. This tool allows you to send multiple requests in parallel for better performance.

Each request in the batch requires a unique 'id' field to identify results. All other parameters are the same as generate_content.

Example usage:
\`\`\`json
{
  "requests": [
    {
      "id": "req1",
      "user_prompt": "Describe image 1",
      "files": [{"path": "/image1.jpg"}]
    },
    {
      "id": "req2", 
      "user_prompt": "Describe image 2",
      "files": [{"path": "/image2.jpg"}]
    },
    {
      "id": "req3",
      "user_prompt": "Summarize this document",
      "files": [{"path": "/doc.pdf"}]
    }
  ],
  "max_concurrency": 5
}
\`\`\`

The response includes success/failure status for each request:
\`\`\`json
{
  "total": 3,
  "succeeded": 2,
  "failed": 1,
  "results": [
    {"id": "req1", "success": true, "content": "..."},
    {"id": "req2", "success": true, "content": "..."},
    {"id": "req3", "success": false, "error": "..."}
  ]
}
\`\`\``;
  }

  /**
   * 获取批量工具输入模式
   */
  private getBatchToolInputSchema() {
    return {
      type: 'object',
      properties: {
        requests: {
          type: 'array',
          description: 'Array of generation requests to process concurrently',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique identifier for this request (required)',
              },
              user_prompt: {
                type: 'string',
                description: 'User prompt for generation',
              },
              system_prompt: {
                type: 'string',
                description: 'System prompt to guide the AI behavior (optional)',
              },
              files: {
                type: 'array',
                description: 'Array of files to include (optional)',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string', description: 'Path to file' },
                    content: { type: 'string', description: 'Base64 encoded file content' },
                    type: { type: 'string', description: 'MIME type (auto-detected if omitted)' },
                  },
                },
                maxItems: this.config.maxFiles,
              },
              model: {
                type: 'string',
                description: 'Gemini model to use',
                default: this.config.defaultModel,
              },
              temperature: {
                type: 'number',
                description: 'Temperature (0-2)',
                default: this.config.defaultTemperature,
              },
              enable_code_execution: {
                type: 'boolean',
                description: 'Enable code execution',
                default: false,
              },
              enable_google_search: {
                type: 'boolean',
                description: 'Enable Google search',
                default: false,
              },
              thinking_budget: {
                type: 'number',
                description: 'Thinking budget (-1 for unlimited)',
                default: -1,
              },
              media_resolution: {
                type: 'string',
                description: 'Media resolution: LOW, MEDIUM, HIGH',
                enum: ['LOW', 'MEDIUM', 'HIGH'],
                default: this.config.defaultMediaResolution,
              },
            },
            required: ['id', 'user_prompt'],
          },
          minItems: 1,
          maxItems: CONCURRENCY_CONFIG.MAX_BATCH_SIZE,
        },
        max_concurrency: {
          type: 'number',
          description: `Maximum concurrent requests (${CONCURRENCY_CONFIG.MIN_CONCURRENCY}-${CONCURRENCY_CONFIG.MAX_CONCURRENCY})`,
          default: CONCURRENCY_CONFIG.DEFAULT_MAX_CONCURRENCY,
          minimum: CONCURRENCY_CONFIG.MIN_CONCURRENCY,
          maximum: CONCURRENCY_CONFIG.MAX_CONCURRENCY,
        },
      },
      required: ['requests'],
    };
  }

  /**
   * 处理工具调用请求
   */
  private async handleCallTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    try {
      if (name === TOOL_NAMES.GENERATE_CONTENT) {
        return await this.generateContent(args as unknown as GenerateContentArgs);
      }
      if (name === TOOL_NAMES.GENERATE_CONTENT_BATCH) {
        return await this.generateContentBatch(args as unknown as GenerateContentBatchArgs);
      }
      throw new Error(ERROR_MESSAGES.UNKNOWN_TOOL(name));
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(error: unknown): CallToolResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${message}` } as TextContent],
      isError: true,
    };
  }

  /**
   * 生成内容
   */
  private async generateContent(args: GenerateContentArgs): Promise<CallToolResult> {
    if (!this.genAI) {
      throw new Error(ERROR_MESSAGES.GENAI_NOT_INITIALIZED);
    }

    const requestConfig = await this.buildRequestConfig(args);
    return await this.executeGeneration(requestConfig);
  }

  /**
   * 批量并发生成内容
   */
  private async generateContentBatch(args: GenerateContentBatchArgs): Promise<CallToolResult> {
    if (!this.genAI) {
      throw new Error(ERROR_MESSAGES.GENAI_NOT_INITIALIZED);
    }

    // 验证请求
    this.validateBatchRequest(args);

    const { requests } = args;
    const maxConcurrency = Math.min(
      Math.max(args.max_concurrency ?? CONCURRENCY_CONFIG.DEFAULT_MAX_CONCURRENCY, CONCURRENCY_CONFIG.MIN_CONCURRENCY),
      CONCURRENCY_CONFIG.MAX_CONCURRENCY
    );

    console.error(LOG_MESSAGES.BATCH_STARTED(requests.length, maxConcurrency));

    // 使用并发控制执行所有请求
    const results = await this.executeWithConcurrencyLimit(
      requests as BatchRequestItem[],
      maxConcurrency
    );

    // 统计结果
    const succeeded = results.filter(r => r.success).length;
    const failed = results.length - succeeded;

    console.error(LOG_MESSAGES.BATCH_COMPLETED(succeeded, failed, results.length));

    // 构建响应
    const response: BatchGenerateResponse = {
      total: results.length,
      succeeded,
      failed,
      results,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) } as TextContent],
    };
  }

  /**
   * 验证批量请求
   */
  private validateBatchRequest(args: GenerateContentBatchArgs): void {
    const { requests } = args;

    if (!requests || requests.length === 0) {
      throw new Error(ERROR_MESSAGES.BATCH_EMPTY_REQUESTS);
    }

    if (requests.length > CONCURRENCY_CONFIG.MAX_BATCH_SIZE) {
      throw new Error(ERROR_MESSAGES.BATCH_TOO_MANY_REQUESTS(requests.length, CONCURRENCY_CONFIG.MAX_BATCH_SIZE));
    }

    // 检查 id 唯一性
    const ids = new Set<string>();
    for (const request of requests) {
      if (!request.id) {
        throw new Error(ERROR_MESSAGES.BATCH_MISSING_ID);
      }
      if (ids.has(request.id)) {
        throw new Error(ERROR_MESSAGES.BATCH_DUPLICATE_ID(request.id));
      }
      ids.add(request.id);
    }
  }

  /**
   * 使用并发限制执行请求
   */
  private async executeWithConcurrencyLimit(
    requests: BatchRequestItem[],
    maxConcurrency: number
  ): Promise<BatchResultItem[]> {
    const results: BatchResultItem[] = [];
    const executing = new Set<Promise<void>>();
    let completedCount = 0;

    for (const request of requests) {
      // 创建执行任务
      const task = (async (): Promise<void> => {
        const result = await this.executeSingleBatchRequest(request);
        results.push(result);
        completedCount++;
        
        // 每完成 5 个请求或全部完成时打印进度
        if (completedCount % 5 === 0 || completedCount === requests.length) {
          console.error(LOG_MESSAGES.BATCH_PROGRESS(completedCount, requests.length));
        }
      })();

      executing.add(task);
      task.finally(() => executing.delete(task));

      // 如果达到并发限制，等待任意一个完成
      if (executing.size >= maxConcurrency) {
        await Promise.race(executing);
      }
    }

    // 等待所有剩余任务完成
    await Promise.all(executing);

    // 按原始顺序排序结果
    const idOrder = new Map(requests.map((r, i) => [r.id, i]));
    results.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

    return results;
  }

  /**
   * 执行单个批量请求
   */
  private async executeSingleBatchRequest(request: BatchRequestItem): Promise<BatchResultItem> {
    try {
      const result = await this.generateContent(request);
      
      // 提取文本内容
      const textContent = result.content
        .filter((c): c is TextContent => c.type === 'text')
        .map(c => c.text)
        .join('\n');

      if (result.isError) {
        return {
          id: request.id,
          success: false,
          error: textContent,
        };
      }

      return {
        id: request.id,
        success: true,
        content: textContent,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        id: request.id,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 构建请求配置
   */
  private async buildRequestConfig(args: GenerateContentArgs): Promise<FullRequestConfig> {
    const model = args.model ?? this.config.defaultModel;
    const messageParts = await this.buildMessagePartsWithFiles(args);
    const contents: MessageContent[] = [{ role: 'user', parts: messageParts }];
    const config = this.buildGenerationConfig(args);

    const requestConfig: FullRequestConfig = { model, contents, config };

    if (args.system_prompt) {
      requestConfig.systemInstruction = {
        parts: [{ text: args.system_prompt }],
      };
    }

    return requestConfig;
  }

  /**
   * 构建包含文件的消息部分
   */
  private async buildMessagePartsWithFiles(args: GenerateContentArgs) {
    const files = args.files ?? [];
    
    if (files.length === 0) {
      return [{ text: args.user_prompt }];
    }

    const processedFiles = processFiles(
      files,
      this.config.maxFiles,
      this.config.maxTotalFileSize
    );

    if (processedFiles.errors.length > 0) {
      throw new Error(`File processing errors:\n${formatFileErrors(processedFiles.errors)}`);
    }

    return buildMessageParts(args.user_prompt, processedFiles.success);
  }

  /**
   * 构建生成配置
   */
  private buildGenerationConfig(args: GenerateContentArgs): RequestConfig {
    const config: RequestConfig = {
      maxOutputTokens: this.config.maxOutputTokens,
      temperature: args.temperature ?? this.config.defaultTemperature,
      responseModalities: ['TEXT'],
    };

    // 媒体分辨率优化
    const mediaResolution = normalizeMediaResolution(
      args.media_resolution ?? this.config.defaultMediaResolution
    );
    if (mediaResolution) {
      config.mediaResolution = mediaResolution;
    }

    // 工具配置
    const tools = this.buildTools(args);
    if (tools.length > 0) {
      config.tools = tools;
    }

    // 思维预算配置
    if (args.thinking_budget !== undefined && args.thinking_budget !== -1) {
      config.thinkingConfig = { thinkingBudget: args.thinking_budget };
    }

    return config;
  }

  /**
   * 构建工具列表
   */
  private buildTools(args: GenerateContentArgs): Array<Record<string, unknown>> {
    const tools: Array<Record<string, unknown>> = [];
    
    if (args.enable_code_execution) {
      tools.push({ codeExecution: {} });
    }
    if (args.enable_google_search) {
      tools.push({ googleSearch: {} });
    }
    
    return tools;
  }

  /**
   * 执行生成请求
   */
  private async executeGeneration(requestConfig: FullRequestConfig): Promise<CallToolResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await this.genAI!.models.generateContentStream(requestConfig as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await this.processStreamResponse(response as any);
    } catch (error) {
      throw new Error(ERROR_MESSAGES.GEMINI_API_ERROR(error));
    }
  }

  /**
   * 处理流式响应
   */
  private async processStreamResponse(
    response: AsyncIterable<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string; executableCode?: CodeBlock; codeExecutionResult?: CodeExecutionResult }> } }> }>
  ): Promise<CallToolResult> {
    let fullText = '';
    const codeBlocks: CodeBlock[] = [];
    const executionResults: CodeExecutionResult[] = [];

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.text) fullText += part.text;
        if (part.executableCode) codeBlocks.push(part.executableCode);
        if (part.codeExecutionResult) executionResults.push(part.codeExecutionResult);
      }
    }

    return this.buildResponse(fullText, codeBlocks, executionResults);
  }

  /**
   * 构建响应
   */
  private buildResponse(
    text: string,
    codeBlocks: readonly CodeBlock[],
    executionResults: readonly CodeExecutionResult[]
  ): CallToolResult {
    const content: TextContent[] = [];

    if (text) {
      content.push({ type: 'text', text });
    }

    const codeBlocksText = formatCodeBlocks(codeBlocks);
    if (codeBlocksText) {
      content.push({ type: 'text', text: codeBlocksText });
    }

    const resultsText = formatExecutionResults(executionResults);
    if (resultsText) {
      content.push({ type: 'text', text: resultsText });
    }

    if (content.length === 0) {
      content.push({ type: 'text', text: 'No content generated' });
    }

    return { content };
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(LOG_MESSAGES.SERVER_RUNNING);
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const server = new ApiyiMcpServer();
  await server.start();
}

// 启动服务器
main().catch((error) => {
  console.error(LOG_MESSAGES.SERVER_ERROR(error));
  process.exit(1);
});

export { ApiyiMcpServer };
