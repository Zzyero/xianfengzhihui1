# 使用 Node.js 18 Alpine 镜像（与 Next.js 兼容性更好，20 可能存在依赖问题）
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制所有项目文件（确保包含 CSS 文件和组件目录）
COPY . .

# 暴露端口
EXPOSE 3000

CMD ["npm", "run", "dev"]