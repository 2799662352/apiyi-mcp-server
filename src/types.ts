/**
 * API易 MCP Server 类型定义
 * @description 定义所有接口和类型，避免使用 any
 */

/** 服务器配置接口 */
export interface ServerConfig {
  readonly timeout: number;
  readonly maxOutputTokens: number;
  readonly defaultModel: string;
  readonly maxFiles: number;
  readonly maxTotalFileSize: number;
  readonly defaultTemperature: number;
  readonly baseUrl: string;
  readonly defaultMediaResolution: MediaResolution;
}

/** 媒体分辨率选项 */
export type MediaResolution = 
  | 'LOW' 
  | 'MEDIUM' 
  | 'HIGH'
  | 'MEDIA_RESOLUTION_LOW'
  | 'MEDIA_RESOLUTION_MEDIUM'
  | 'MEDIA_RESOLUTION_HIGH';

/** 文件输入接口 */
export interface FileInput {
  readonly path?: string;
  readonly content?: string;
  readonly type?: string;
  readonly name?: string;
}

/** 处理后的文件结果 */
export interface ProcessedFile {
  readonly content: string;
  readonly type: string;
  readonly name?: string;
}

/** 文件处理错误 */
export interface FileProcessingError {
  readonly name?: string;
  readonly error: string;
}

/** 文件处理结果 */
export interface FileProcessingResult {
  readonly success: readonly ProcessedFile[];
  readonly errors: readonly FileProcessingError[];
}

/** 生成内容请求参数 */
export interface GenerateContentArgs {
  readonly user_prompt: string;
  readonly system_prompt?: string;
  readonly files?: readonly FileInput[];
  readonly model?: string;
  readonly temperature?: number;
  readonly enable_code_execution?: boolean;
  readonly enable_google_search?: boolean;
  readonly thinking_budget?: number;
  readonly media_resolution?: MediaResolution;
}

/** 消息部分 - 文本 */
export interface TextPart {
  readonly text: string;
}

/** 消息部分 - 内联数据 */
export interface InlineDataPart {
  readonly inlineData: {
    readonly mimeType: string;
    readonly data: string;
  };
}

/** 消息部分联合类型 */
export type MessagePart = TextPart | InlineDataPart;

/** 消息内容 */
export interface MessageContent {
  readonly role: 'user' | 'model';
  readonly parts: readonly MessagePart[];
}

/** 代码块 */
export interface CodeBlock {
  readonly language?: string;
  readonly code: string;
}

/** 代码执行结果 */
export interface CodeExecutionResult {
  readonly output?: string;
  readonly error?: string;
}

/** API 响应内容 */
export interface ResponseContentItem {
  readonly type: 'text';
  readonly text: string;
}

/** API 响应 */
export interface GenerateContentResponse {
  readonly content: readonly ResponseContentItem[];
  readonly isError?: boolean;
}

/** 工具定义 */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

/** 请求配置 */
export interface RequestConfig {
  maxOutputTokens: number;
  temperature: number;
  responseModalities: readonly string[];
  mediaResolution?: string;
  tools?: readonly Record<string, unknown>[];
  thinkingConfig?: {
    readonly thinkingBudget: number;
  };
}

/** 完整请求配置 */
export interface FullRequestConfig {
  readonly model: string;
  readonly contents: readonly MessageContent[];
  readonly config: RequestConfig;
  systemInstruction?: {
    readonly parts: readonly TextPart[];
  };
}

/** MIME 类型映射 */
export type MimeTypeMap = Readonly<Record<string, string>>;

/** 环境变量配置 */
export interface EnvironmentConfig {
  readonly APIYI_API_KEY?: string;
  readonly GEMINI_API_KEY?: string;
  readonly APIYI_BASE_URL?: string;
  readonly GEMINI_BASE_URL?: string;
  readonly GEMINI_TIMEOUT?: string;
  readonly GEMINI_MAX_OUTPUT_TOKENS?: string;
  readonly GEMINI_MODEL?: string;
  readonly GEMINI_MAX_FILES?: string;
  readonly GEMINI_MAX_TOTAL_FILE_SIZE?: string;
  readonly GEMINI_TEMPERATURE?: string;
  readonly GEMINI_MEDIA_RESOLUTION?: string;
}

/** 批量请求中的单个请求项 */
export interface BatchRequestItem extends GenerateContentArgs {
  /** 请求唯一标识符，用于匹配结果 */
  readonly id: string;
}

/** 批量生成内容请求参数 */
export interface GenerateContentBatchArgs {
  /** 请求数组 */
  readonly requests: readonly BatchRequestItem[];
  /** 最大并发数，默认为 5 */
  readonly max_concurrency?: number;
}

/** 批量响应中的单个结果 */
export interface BatchResultItem {
  /** 请求唯一标识符 */
  readonly id: string;
  /** 是否成功 */
  readonly success: boolean;
  /** 生成的内容（成功时） */
  readonly content?: string;
  /** 错误信息（失败时） */
  readonly error?: string;
}

/** 批量生成响应 */
export interface BatchGenerateResponse {
  /** 总请求数 */
  readonly total: number;
  /** 成功数 */
  readonly succeeded: number;
  /** 失败数 */
  readonly failed: number;
  /** 结果列表 */
  readonly results: readonly BatchResultItem[];
}
