# API易 MCP Server Dockerfile
# 支持 Gemini 原生多模态处理（视频/音频/图片/文档）

FROM node:20-slim

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --production=false

# 复制源码
COPY . .

# 编译 TypeScript
RUN npm run build

# 清理开发依赖
RUN npm prune --production

# 环境变量配置
# API易 API 密钥 (必需)
ENV APIYI_API_KEY=""
# API易 端点 (默认)
ENV APIYI_BASE_URL="https://api.apiyi.com"
# 模型配置
ENV GEMINI_MODEL="gemini-2.5-flash"
# 超时设置 (毫秒)
ENV GEMINI_TIMEOUT="600000"
# 最大输出 tokens
ENV GEMINI_MAX_OUTPUT_TOKENS="16384"
# 最大文件数
ENV GEMINI_MAX_FILES="10"
# 最大总文件大小 (MB)
ENV GEMINI_MAX_TOTAL_FILE_SIZE="100"
# 默认温度
ENV GEMINI_TEMPERATURE="0.2"
# 媒体分辨率 (LOW | MEDIUM | HIGH)
ENV GEMINI_MEDIA_RESOLUTION="MEDIUM"

# 运行 MCP Server
CMD ["node", "dist/index.js"]





