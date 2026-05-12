/**
 * API易 MCP Server 常量定义
 * @description 集中管理所有常量，避免魔法数字
 */

import type { MimeTypeMap, ServerConfig } from './types.js';

/** 服务器名称 */
export const SERVER_NAME = 'apiyi-mcp-server' as const;

/** 服务器版本 */
export const SERVER_VERSION = '1.0.0' as const;

/** API易默认端点 */
export const DEFAULT_APIYI_BASE_URL = 'https://api.bltcy.ai' as const;

/** 默认配置值 */
export const DEFAULT_CONFIG = {
  /** 默认超时时间 (毫秒) - 5分钟 */
  TIMEOUT_MS: 300_000,
  /** 默认最大输出 tokens */
  MAX_OUTPUT_TOKENS: 8192,
  /** 默认模型 */
  MODEL: 'gemini-3.1-pro-preview-thinking',
  /** 默认最大文件数 */
  MAX_FILES: 10,
  /** 默认最大总文件大小 (MB) */
  MAX_TOTAL_FILE_SIZE_MB: 50,
  /** 默认温度参数 */
  TEMPERATURE: 0.2,
  /** 默认媒体分辨率 */
  MEDIA_RESOLUTION: 'MEDIUM',
} as const;

/** 字节单位常量 */
export const BYTES = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
} as const;

/** 温度参数范围 */
export const TEMPERATURE_RANGE = {
  MIN: 0,
  MAX: 2,
} as const;

/** 文档 MIME 类型 */
const DOCUMENT_MIME_TYPES: MimeTypeMap = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;

/** 图片 MIME 类型 */
const IMAGE_MIME_TYPES: MimeTypeMap = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
} as const;

/** 视频 MIME 类型 */
const VIDEO_MIME_TYPES: MimeTypeMap = {
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.flv': 'video/x-flv',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg',
  '.wmv': 'video/x-ms-wmv',
} as const;

/** 音频 MIME 类型 */
const AUDIO_MIME_TYPES: MimeTypeMap = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aiff': 'audio/aiff',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
} as const;

/** 文本 MIME 类型 */
const TEXT_MIME_TYPES: MimeTypeMap = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.htm': 'text/html',
} as const;

/** 所有支持的 MIME 类型 */
export const MIME_TYPES: MimeTypeMap = {
  ...DOCUMENT_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...AUDIO_MIME_TYPES,
  ...TEXT_MIME_TYPES,
} as const;

/** 默认 MIME 类型 */
export const DEFAULT_MIME_TYPE = 'application/octet-stream' as const;

/** 媒体分辨率前缀 */
export const MEDIA_RESOLUTION_PREFIX = 'MEDIA_RESOLUTION_' as const;

/** 有效的媒体分辨率值 */
export const VALID_MEDIA_RESOLUTIONS = [
  'LOW',
  'MEDIUM', 
  'HIGH',
  'MEDIA_RESOLUTION_LOW',
  'MEDIA_RESOLUTION_MEDIUM',
  'MEDIA_RESOLUTION_HIGH',
] as const;

/** 工具名称 */
export const TOOL_NAMES = {
  GENERATE_CONTENT: 'generate_content',
  GENERATE_CONTENT_BATCH: 'generate_content_batch',
} as const;

/** 默认并发配置 */
export const CONCURRENCY_CONFIG = {
  /** 默认最大并发数 */
  DEFAULT_MAX_CONCURRENCY: 5,
  /** 最小并发数 */
  MIN_CONCURRENCY: 1,
  /** 最大并发数 */
  MAX_CONCURRENCY: 20,
  /** 最大批量请求数 */
  MAX_BATCH_SIZE: 50,
} as const;

/** 错误消息 */
export const ERROR_MESSAGES = {
  API_KEY_REQUIRED: 'APIYI_API_KEY or GEMINI_API_KEY environment variable is required',
  GENAI_NOT_INITIALIZED: 'GenAI not initialized',
  UNKNOWN_TOOL: (name: string) => `Unknown tool: ${name}`,
  TOO_MANY_FILES: (count: number, max: number) => `Too many files: ${count}. Maximum allowed: ${max}`,
  TOTAL_SIZE_EXCEEDED: (size: number, max: number) => 
    `Total file size exceeded: ${Math.round(size / BYTES.MB)}MB. Maximum allowed: ${Math.round(max / BYTES.MB)}MB`,
  FILE_READ_FAILED: (error: unknown) => `Failed to read file: ${error}`,
  FILE_MISSING_PATH_OR_CONTENT: 'Either content or path must be provided for each file',
  FILE_PROCESSING_ERROR: (error: unknown) => `Processing error: ${error}`,
  GEMINI_API_ERROR: (error: unknown) => `Gemini API error: ${error}`,
  // 批量处理错误消息
  BATCH_EMPTY_REQUESTS: 'Batch requests array cannot be empty',
  BATCH_TOO_MANY_REQUESTS: (count: number, max: number) => `Too many batch requests: ${count}. Maximum allowed: ${max}`,
  BATCH_MISSING_ID: 'Each batch request must have a unique id',
  BATCH_DUPLICATE_ID: (id: string) => `Duplicate request id: ${id}`,
  BATCH_REQUEST_FAILED: (id: string, error: unknown) => `Request ${id} failed: ${error}`,
} as const;

/** 日志消息 */
export const LOG_MESSAGES = {
  SERVER_CONFIG: 'API易 MCP Server configuration:',
  BASE_URL: (url: string) => `- Base URL: ${url}`,
  TIMEOUT: (ms: number) => `- Timeout: ${ms}ms (${ms / 1000}s)`,
  MAX_OUTPUT_TOKENS: (tokens: number) => `- Max Output Tokens: ${tokens}`,
  DEFAULT_MODEL: (model: string) => `- Default Model: ${model}`,
  MAX_FILES: (count: number) => `- Max Files: ${count}`,
  MAX_TOTAL_FILE_SIZE: (mb: number) => `- Max Total File Size: ${mb}MB`,
  DEFAULT_TEMPERATURE: (temp: number) => `- Default Temperature: ${temp}`,
  MEDIA_RESOLUTION: (res: string) => `- Media Resolution: ${res}`,
  SERVER_RUNNING: 'API易 MCP Server running on stdio',
  PATH_ACCESS_WARNING: (path: string) => `Accessing path: ${path}`,
  INIT_FAILED: (error: unknown) => `Failed to initialize Google GenAI with API易: ${error}`,
  SERVER_ERROR: (error: unknown) => `Server error: ${error}`,
  // 批量处理日志消息
  BATCH_STARTED: (count: number, concurrency: number) => `Starting batch processing: ${count} requests with concurrency ${concurrency}`,
  BATCH_PROGRESS: (completed: number, total: number) => `Batch progress: ${completed}/${total}`,
  BATCH_COMPLETED: (succeeded: number, failed: number, total: number) => 
    `Batch completed: ${succeeded} succeeded, ${failed} failed out of ${total} total`,
} as const;

/**
 * 从环境变量获取值
 * @param key - 环境变量键名
 * @param defaultValue - 默认值
 * @returns 环境变量值或默认值
 */
function getEnvVar(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * 从环境变量创建服务器配置
 * @returns 服务器配置对象
 */
export function createConfigFromEnvironment(): ServerConfig {
  return {
    timeout: parseInt(getEnvVar('GEMINI_TIMEOUT', String(DEFAULT_CONFIG.TIMEOUT_MS))),
    maxOutputTokens: parseInt(getEnvVar('GEMINI_MAX_OUTPUT_TOKENS', String(DEFAULT_CONFIG.MAX_OUTPUT_TOKENS))),
    defaultModel: getEnvVar('GEMINI_MODEL', DEFAULT_CONFIG.MODEL),
    maxFiles: parseInt(getEnvVar('GEMINI_MAX_FILES', String(DEFAULT_CONFIG.MAX_FILES))),
    maxTotalFileSize: parseInt(getEnvVar('GEMINI_MAX_TOTAL_FILE_SIZE', String(DEFAULT_CONFIG.MAX_TOTAL_FILE_SIZE_MB))) * BYTES.MB,
    defaultTemperature: parseFloat(getEnvVar('GEMINI_TEMPERATURE', String(DEFAULT_CONFIG.TEMPERATURE))),
    baseUrl: getEnvVar('APIYI_BASE_URL', getEnvVar('GEMINI_BASE_URL', DEFAULT_APIYI_BASE_URL)),
    defaultMediaResolution: getEnvVar('GEMINI_MEDIA_RESOLUTION', DEFAULT_CONFIG.MEDIA_RESOLUTION) as ServerConfig['defaultMediaResolution'],
  };
}
