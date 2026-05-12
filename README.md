# API易 MCP Server

[![Docker Hub](https://img.shields.io/docker/v/zuozuoliang999/apiyi-mcp-server?label=Docker%20Hub&logo=docker)](https://hub.docker.com/r/zuozuoliang999/apiyi-mcp-server)
[![GitHub](https://img.shields.io/github/stars/2799662352/apiyi-mcp-server?style=social)](https://github.com/2799662352/apiyi-mcp-server)

基于 [aistudio-mcp-server](https://github.com/eternnoir/aistudio-mcp-server) 改造，支持 [API易](https://docs.apiyi.com/) 的 Gemini 原生格式调用。

**Docker Hub**: `zuozuoliang999/apiyi-mcp-server`

## ✨ 特性

- 🎬 **视频理解**：支持 MP4, AVI, MOV, WebM, FLV, MPG, WMV (最大 20MB)
- 🎙️ **音频处理**：支持 MP3, WAV, AIFF, AAC, OGG, FLAC
- 🖼️ **图片分析**：支持 JPG, PNG, GIF, WebP, SVG, BMP, TIFF
- 📄 **文档转换**：PDF 转 Markdown，支持 TXT, MD, JSON, XML, CSV, HTML
- 🔍 **Google 搜索**：内置 Google 搜索能力
- 💻 **代码执行**：支持 Python 代码执行
- 🧠 **思维链推理**：支持 Gemini 2.5 系列的 thinking_budget
- 💰 **分辨率优化**：支持媒体分辨率调整，节省 tokens 费用
- 🐳 **Docker 支持**：完整的 Docker 容器化部署

## 🚀 快速开始

### 1. 获取 API易 密钥

1. 访问 [API易控制台](https://api.apiyi.com/) 注册账号
2. 充值后获取 API Key

### 2. 配置 MCP 客户端

#### Cursor / Claude Desktop 配置

```json
{
  "mcpServers": {
    "apiyi": {
      "command": "node",
      "args": ["D:/jianji_FFMPEG/apiyi-mcp-server/dist/index.js"],
      "env": {
        "APIYI_API_KEY": "你的API易密钥",
        "GEMINI_MODEL": "gemini-3.1-pro-preview-thinking",
        "APIYI_BASE_URL": "https://api.apiyi.com"
      }
    }
  }
}
```

#### 使用 npx 方式（需要先发布到 npm）

```json
{
  "mcpServers": {
    "apiyi": {
      "command": "npx",
      "args": ["-y", "apiyi-mcp-server"],
      "env": {
        "APIYI_API_KEY": "你的API易密钥"
      }
    }
  }
}
```

### 3. 🐳 Docker 部署 (推荐)

**无需安装 Node.js，直接从 Docker Hub 拉取镜像！**

```bash
# 直接使用 Docker Hub 镜像
docker pull zuozuoliang999/apiyi-mcp-server:latest

# 运行容器
docker run -it --rm \
  -e APIYI_API_KEY=你的API易密钥 \
  -v /path/to/your/media:/app/media:ro \
  zuozuoliang999/apiyi-mcp-server:latest
```

#### 使用 docker-compose

```bash
# 克隆项目
git clone https://github.com/2799662352/apiyi-mcp-server.git
cd apiyi-mcp-server

# 创建环境变量文件
echo "APIYI_API_KEY=你的API易密钥" > .env

# 启动服务
docker-compose up -d

# 查看日志
docker logs -f apiyi-mcp-server
```

#### Cursor MCP 配置 (Docker 方式)

```json
{
  "mcpServers": {
    "apiyi": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "APIYI_API_KEY=你的API易密钥",
        "-v", "/path/to/your/media:/app/media:ro",
        "zuozuoliang999/apiyi-mcp-server:latest"
      ]
    }
  }
}
```

#### Windows + Cursor 完整实战配置（含长输出 / 长超时 / Gemini 3.1 思维链）

下面这份是经过实测可用的 Windows 配置：把整个 `D:\` 盘以只读方式挂进容器内的 `/app/media`，这样 Cursor 里给 `files.path` 传 `D:/video/foo.mp4` 也能直接被容器读到；同时通过 `-e` 单独声明环境变量（key 从 `env` 字段注入，避免在 `args` 里出现明文密钥）。

```json
{
  "mcpServers": {
    "apiyi": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "APIYI_API_KEY",
        "-e", "GEMINI_MODEL",
        "-e", "APIYI_BASE_URL",
        "-e", "GEMINI_MAX_OUTPUT_TOKENS",
        "-e", "GEMINI_TIMEOUT",
        "-v", "D:/:/app/media:ro",
        "zuozuoliang999/apiyi-mcp-server:latest"
      ],
      "env": {
        "APIYI_API_KEY": "sk-YOUR_API_KEY_HERE",
        "GEMINI_MODEL": "gemini-3.1-pro-preview-thinking",
        "APIYI_BASE_URL": "https://api.apiyi.com",
        "GEMINI_MAX_OUTPUT_TOKENS": "65536",
        "GEMINI_TIMEOUT": "1800000"
      }
    }
  }
}
```

要点说明：

- `-v D:/:/app/media:ro`：把整个 `D:` 盘只读挂载到容器，Cursor 中无论传 `D:/...` 还是 `D:\...` 路径都能命中容器内 `/app/media/...`。
- 用 `-e KEY` + `env.KEY` 的分离写法，可避免把密钥明文写在 `args` 中（args 在某些日志里会被打印）。
- `GEMINI_MAX_OUTPUT_TOKENS=65536`：跑长视频/长文档分析时建议放开，默认 8192 容易被截断。
- `GEMINI_TIMEOUT=1800000`（30 分钟）：搭配 thinking 模型/大文件多模态分析时避免提前超时。
- `GEMINI_MODEL=gemini-3.1-pro-preview-thinking`：开启 Gemini 3.1 思维链模型；如想节省成本可改回 `gemini-2.5-flash`。

### 4. 本地开发 (需要 Node.js)

```bash
# 进入项目目录
cd D:\jianji_FFMPEG\apiyi-mcp-server

# 安装依赖
npm install

# 编译
npm run build

# 启动
npm start
```

## ⚙️ 环境变量配置

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `APIYI_API_KEY` | API易 密钥 (必需) | - |
| `GEMINI_API_KEY` | 备用：Google AI Studio 密钥 | - |
| `APIYI_BASE_URL` | API易 端点 | `https://api.apiyi.com` |
| `GEMINI_BASE_URL` | 备用：自定义端点 | - |
| `GEMINI_MODEL` | 默认模型 | `gemini-3.1-pro-preview-thinking` |
| `GEMINI_TIMEOUT` | 超时时间 (ms) | `300000` (5分钟) |
| `GEMINI_MAX_OUTPUT_TOKENS` | 最大输出 tokens | `8192` |
| `GEMINI_MAX_FILES` | 最大文件数 | `10` |
| `GEMINI_MAX_TOTAL_FILE_SIZE` | 最大总文件大小 (MB) | `50` |
| `GEMINI_TEMPERATURE` | 温度参数 | `0.2` |
| `GEMINI_MEDIA_RESOLUTION` | 媒体分辨率 (LOW/MEDIUM/HIGH) | `MEDIUM` |

## 📖 使用示例

### 视频理解

```json
{
  "user_prompt": "分析这个视频的内容，描述主要场景和人物动作",
  "files": [
    {
      "path": "D:/jianji_FFMPEG/误解向剪辑.mp4"
    }
  ]
}
```

### 图片分析

```json
{
  "user_prompt": "描述这张图片中的内容",
  "files": [
    {
      "path": "/path/to/image.jpg"
    }
  ]
}
```

### PDF 转 Markdown

```json
{
  "user_prompt": "将这个 PDF 转换为格式良好的 Markdown，保留结构和格式",
  "files": [
    {"path": "/document.pdf"}
  ]
}
```

### Google 搜索

```json
{
  "user_prompt": "2024年最新的AI技术突破有哪些？",
  "enable_google_search": true
}
```

### 代码执行

```json
{
  "user_prompt": "编写并运行一个计算100以内质数的Python脚本",
  "enable_code_execution": true
}
```

### 思维链推理 (Gemini 3.1 Thinking)

```json
{
  "user_prompt": "详细分析量子计算的技术方案",
  "model": "gemini-3.1-pro-preview-thinking"
}
```

> Gemini 3.1 思维链版本默认开启 thinking，无需手动指定 `thinking_budget`。若你仍想精细控制，可继续传 `thinking_budget` 参数。

### 💰 媒体分辨率优化 (节省费用)

使用较低分辨率处理图片/视频，节省 tokens 费用：

```json
{
  "user_prompt": "这张图片的主题是什么？",
  "files": [{"path": "/path/to/large_image.jpg"}],
  "media_resolution": "LOW"
}
```

| 分辨率 | 说明 | 适用场景 |
|--------|------|----------|
| `LOW` | 最低分辨率 | 简单识别、节省费用 |
| `MEDIUM` | 中等分辨率 (默认) | 一般场景 |
| `HIGH` | 最高分辨率 | 需要细节分析 |

## 📚 API易 文档参考

- [Gemini 原生格式调用](https://docs.apiyi.com/api-capabilities/gemini-native-format)
- [多模态处理](https://docs.apiyi.com/api-capabilities/gemini-native-format#%E5%A4%9A%E6%A8%A1%E6%80%81%E5%A4%84%E7%90%86)
- [视频处理](https://docs.apiyi.com/api-capabilities/gemini-native-format#%E8%A7%86%E9%A2%91%E5%A4%84%E7%90%86)

## 🔧 支持的模型

| 模型 | 描述 |
|------|------|
| `gemini-3.1-pro-preview-thinking` | **默认**：Gemini 3.1 思维链版本，最强复杂任务/长上下文 |
| `gemini-3.1-pro-preview` | Gemini 3.1 标准版（不开 thinking，速度更快） |
| `gemini-3-pro-preview` | Gemini 3 预览版（上一代） |
| `gemini-2.5-flash` | 混合推理，响应最快，适合简单识别 |

## ⚠️ 注意事项

1. **文件大小限制**：单个媒体文件不超过 20MB
2. **推理成本**：thinking tokens 会计入输出成本
3. **代码执行**：仅支持 Python，在沙箱环境中运行
4. **API 密钥**：使用 API易 密钥，非 Google AI Studio 密钥

## 🔗 链接

- **GitHub**: [https://github.com/2799662352/apiyi-mcp-server](https://github.com/2799662352/apiyi-mcp-server)
- **Docker Hub**: [https://hub.docker.com/r/zuozuoliang999/apiyi-mcp-server](https://hub.docker.com/r/zuozuoliang999/apiyi-mcp-server)
- **API易文档**: [https://docs.apiyi.com/](https://docs.apiyi.com/)

## 📄 许可证

MIT License

基于 [eternnoir/aistudio-mcp-server](https://github.com/eternnoir/aistudio-mcp-server) 修改
