FROM node:20-slim AS builder
WORKDIR /app

# server 의존성 설치
COPY server/package*.json ./server/
RUN cd server && npm ci

# shared + server 소스 복사
COPY shared/ ./shared/
COPY server/ ./server/

# 빌드
RUN cd server && npm run build

FROM node:20-slim
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/server/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
