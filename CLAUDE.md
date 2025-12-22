# API易 MCP Server - 开发指南

## 项目概述

基于 [aistudio-mcp-server](https://github.com/eternnoir/aistudio-mcp-server) 改造，支持 [API易](https://docs.apiyi.com/) 的 Gemini 原生格式调用。

## 项目结构

```
apiyi-mcp-server/
├── src/
│   ├── index.ts       # 主服务器类和入口点
│   ├── types.ts       # TypeScript 类型定义
│   ├── constants.ts   # 常量和配置
│   └── utils.ts       # 工具函数
├── bin/
│   └── apiyi-mcp-server  # CLI 入口
├── dist/              # 编译输出
├── Dockerfile         # Docker 构建文件
├── docker-compose.yml # Docker Compose 配置
├── tsconfig.json      # TypeScript 配置
└── package.json       # 项目配置
```

## 代码规范

### TypeScript 规范

- **避免使用 `any`** - 所有类型定义在 `types.ts`
- **使用 `readonly`** - 不可变数据使用 readonly 修饰
- **单一职责原则** - 每个函数/类只做一件事
- **命名规范**:
  - 类: `PascalCase` (如 `ApiyiMcpServer`)
  - 函数/变量: `camelCase` (如 `processFiles`)
  - 常量: `SCREAMING_SNAKE_CASE` (如 `DEFAULT_CONFIG`)
  - 类型: `PascalCase` (如 `ServerConfig`)

### 文件组织

- `types.ts` - 所有接口和类型定义
- `constants.ts` - 常量、默认值、错误消息
- `utils.ts` - 纯函数工具
- `index.ts` - 服务器类和主逻辑

### JSDoc 注释

所有公共函数和类必须有 JSDoc 注释：

```typescript
/**
 * 根据文件扩展名获取 MIME 类型
 * @param filePath - 文件路径
 * @returns MIME 类型字符串
 */
export function getMimeType(filePath: string): string {
  // ...
}
```

## 构建和测试

### 本地开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 运行
npm start
```

### Docker 部署

```bash
# 构建镜像
docker build -t apiyi-mcp-server .

# 运行
docker run -it --rm \
  -e APIYI_API_KEY=your_key \
  apiyi-mcp-server
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `APIYI_API_KEY` | API易 密钥 (必需) | - |
| `APIYI_BASE_URL` | API易 端点 | `https://api.apiyi.com` |
| `GEMINI_MODEL` | 默认模型 | `gemini-2.5-flash` |
| `GEMINI_TIMEOUT` | 超时 (ms) | `300000` |
| `GEMINI_MAX_OUTPUT_TOKENS` | 最大输出 tokens | `8192` |
| `GEMINI_MAX_FILES` | 最大文件数 | `10` |
| `GEMINI_MAX_TOTAL_FILE_SIZE` | 最大总大小 (MB) | `50` |
| `GEMINI_TEMPERATURE` | 温度参数 | `0.2` |
| `GEMINI_MEDIA_RESOLUTION` | 媒体分辨率 | `MEDIUM` |

## 主要功能

- 🎬 **视频理解** - MP4, AVI, MOV, WebM, FLV, MPG, WMV
- 🎙️ **音频处理** - MP3, WAV, AIFF, AAC, OGG, FLAC
- 🖼️ **图片分析** - JPG, PNG, GIF, WebP, SVG, BMP, TIFF
- 📄 **文档处理** - PDF, DOCX, XLSX, PPTX, TXT, MD, JSON, XML, CSV, HTML
- 💰 **媒体分辨率优化** - LOW / MEDIUM / HIGH (节省 tokens)
- 🔍 **Google 搜索** - `enable_google_search: true`
- 💻 **代码执行** - `enable_code_execution: true`
- 🧠 **思维链推理** - `thinking_budget` 参数
