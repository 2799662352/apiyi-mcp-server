/**
 * API易 MCP Server 工具函数
 * @description 提供文件处理、MIME 类型检测等辅助功能
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  FileInput,
  FileProcessingResult,
  ProcessedFile,
  FileProcessingError,
  MediaResolution,
} from './types.js';
import {
  MIME_TYPES,
  DEFAULT_MIME_TYPE,
  MEDIA_RESOLUTION_PREFIX,
  ERROR_MESSAGES,
  LOG_MESSAGES,
} from './constants.js';

/**
 * 根据文件扩展名获取 MIME 类型
 * @param filePath - 文件路径
 * @returns MIME 类型字符串
 */
export function getMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  return MIME_TYPES[extension] ?? DEFAULT_MIME_TYPE;
}

/**
 * 标准化媒体分辨率格式
 * @param resolution - 原始分辨率值
 * @returns 标准化后的分辨率值
 */
export function normalizeMediaResolution(resolution: MediaResolution | string): string {
  if (!resolution) {
    return '';
  }
  
  const upperResolution = resolution.toUpperCase();
  if (upperResolution.startsWith(MEDIA_RESOLUTION_PREFIX)) {
    return upperResolution;
  }
  
  return `${MEDIA_RESOLUTION_PREFIX}${upperResolution}`;
}

/**
 * 检查路径是否包含可疑的遍历模式
 * @param filePath - 文件路径
 * @returns 是否包含可疑模式
 */
function hasPathTraversal(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  return normalizedPath.includes('..') || normalizedPath.startsWith('/');
}

/**
 * 读取文件并转换为 base64
 * @param filePath - 文件路径
 * @returns 包含文件内容和大小的对象
 */
function readFileAsBase64(filePath: string): { content: string; size: number; name: string } {
  const resolvedPath = path.resolve(filePath);
  
  if (hasPathTraversal(filePath)) {
    console.warn(LOG_MESSAGES.PATH_ACCESS_WARNING(filePath));
  }
  
  const buffer = fs.readFileSync(resolvedPath);
  return {
    content: buffer.toString('base64'),
    size: buffer.length,
    name: path.basename(resolvedPath),
  };
}

/**
 * 处理单个文件
 * @param file - 文件输入
 * @param currentTotalSize - 当前累计大小
 * @param maxTotalFileSize - 最大允许总大小
 * @returns 处理结果或错误
 */
function processSingleFile(
  file: FileInput,
  currentTotalSize: number,
  maxTotalFileSize: number
): { result?: ProcessedFile; error?: FileProcessingError; newTotalSize: number } {
  
  // 处理 base64 内容
  if (file.content) {
    const fileName = file.name ?? 'inline-content';
    const mimeType = file.type ?? DEFAULT_MIME_TYPE;
    
    return {
      result: { content: file.content, type: mimeType, name: fileName },
      newTotalSize: currentTotalSize,
    };
  }
  
  // 处理文件路径
  if (file.path) {
    try {
      const { content, size, name } = readFileAsBase64(file.path);
      const newTotalSize = currentTotalSize + size;
      
      if (newTotalSize > maxTotalFileSize) {
        return {
          error: { name, error: ERROR_MESSAGES.TOTAL_SIZE_EXCEEDED(newTotalSize, maxTotalFileSize) },
          newTotalSize,
        };
      }
      
      const mimeType = file.type ?? getMimeType(file.path);
      return {
        result: { content, type: mimeType, name },
        newTotalSize,
      };
    } catch (err) {
      return {
        error: { name: file.path, error: ERROR_MESSAGES.FILE_READ_FAILED(err) },
        newTotalSize: currentTotalSize,
      };
    }
  }
  
  // 缺少必要参数
  return {
    error: { error: ERROR_MESSAGES.FILE_MISSING_PATH_OR_CONTENT },
    newTotalSize: currentTotalSize,
  };
}

/**
 * 批量处理文件
 * @param files - 文件输入数组
 * @param maxFiles - 最大文件数
 * @param maxTotalFileSize - 最大总文件大小
 * @returns 处理结果
 */
export function processFiles(
  files: readonly FileInput[],
  maxFiles: number,
  maxTotalFileSize: number
): FileProcessingResult {
  if (files.length > maxFiles) {
    throw new Error(ERROR_MESSAGES.TOO_MANY_FILES(files.length, maxFiles));
  }
  
  const successList: ProcessedFile[] = [];
  const errorList: FileProcessingError[] = [];
  let totalSize = 0;
  
  for (const file of files) {
    try {
      const { result, error, newTotalSize } = processSingleFile(file, totalSize, maxTotalFileSize);
      totalSize = newTotalSize;
      
      if (error) {
        errorList.push(error);
        // 如果是大小超限，停止处理
        if (error.error.includes('exceeded')) {
          break;
        }
        continue;
      }
      
      if (result) {
        successList.push(result);
      }
    } catch (err) {
      errorList.push({
        name: file.path ?? file.name ?? 'unknown',
        error: ERROR_MESSAGES.FILE_PROCESSING_ERROR(err),
      });
    }
  }
  
  return { success: successList, errors: errorList };
}

/**
 * 构建消息部分
 * @param prompt - 用户提示
 * @param processedFiles - 处理后的文件
 * @returns 消息部分数组
 */
export function buildMessageParts(
  prompt: string,
  processedFiles: readonly ProcessedFile[]
): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];
  
  for (const file of processedFiles) {
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: file.content,
      },
    });
  }
  
  return parts;
}

/**
 * 格式化代码块
 * @param codeBlocks - 代码块数组
 * @returns 格式化后的字符串
 */
export function formatCodeBlocks(
  codeBlocks: ReadonlyArray<{ language?: string; code: string }>
): string {
  if (codeBlocks.length === 0) {
    return '';
  }
  
  const formatted = codeBlocks
    .map((code) => `\`\`\`${code.language ?? ''}\n${code.code}\n\`\`\``)
    .join('\n\n');
  
  return `\n\n**Executable Code:**\n${formatted}`;
}

/**
 * 格式化执行结果
 * @param results - 执行结果数组
 * @returns 格式化后的字符串
 */
export function formatExecutionResults(
  results: ReadonlyArray<{ output?: string; error?: string }>
): string {
  if (results.length === 0) {
    return '';
  }
  
  const formatted = results
    .map((result, index) => `Result ${index + 1}:\n${result.output ?? result.error ?? 'No output'}`)
    .join('\n\n');
  
  return `\n\n**Execution Results:**\n${formatted}`;
}

/**
 * 格式化文件处理错误
 * @param errors - 错误数组
 * @returns 格式化后的错误消息
 */
export function formatFileErrors(errors: readonly FileProcessingError[]): string {
  return errors
    .map((err) => (err.name ? `${err.name}: ${err.error}` : err.error))
    .join('\n');
}

/**
 * 获取 API 密钥
 * @returns API 密钥字符串
 * @throws 如果未设置环境变量则抛出错误
 */
export function getApiKey(): string {
  const apiKey = process.env['APIYI_API_KEY'] ?? process.env['GEMINI_API_KEY'];
  
  if (!apiKey) {
    throw new Error(ERROR_MESSAGES.API_KEY_REQUIRED);
  }
  
  return apiKey;
}

/**
 * 打印服务器配置
 * @param config - 服务器配置
 */
export function logServerConfig(config: {
  baseUrl: string;
  timeout: number;
  maxOutputTokens: number;
  defaultModel: string;
  maxFiles: number;
  maxTotalFileSize: number;
  defaultTemperature: number;
  defaultMediaResolution: string;
}): void {
  console.error(LOG_MESSAGES.SERVER_CONFIG);
  console.error(LOG_MESSAGES.BASE_URL(config.baseUrl));
  console.error(LOG_MESSAGES.TIMEOUT(config.timeout));
  console.error(LOG_MESSAGES.MAX_OUTPUT_TOKENS(config.maxOutputTokens));
  console.error(LOG_MESSAGES.DEFAULT_MODEL(config.defaultModel));
  console.error(LOG_MESSAGES.MAX_FILES(config.maxFiles));
  console.error(LOG_MESSAGES.MAX_TOTAL_FILE_SIZE(Math.round(config.maxTotalFileSize / (1024 * 1024))));
  console.error(LOG_MESSAGES.DEFAULT_TEMPERATURE(config.defaultTemperature));
  console.error(LOG_MESSAGES.MEDIA_RESOLUTION(config.defaultMediaResolution));
}





