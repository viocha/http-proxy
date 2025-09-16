FROM node:22-slim

WORKDIR /app

# 先复制依赖文件，利用缓存避免每次都重装
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# 再复制源码
COPY . .

# 编译
RUN pnpm tsc || true

EXPOSE 8000

CMD ["node", "dist/main-node.js"]
