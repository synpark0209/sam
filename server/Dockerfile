FROM node:20-slim AS builder
WORKDIR /app/server

# 의존성 설치
COPY package*.json ./
RUN npm ci

# 서버 소스 복사
COPY . .

# shared를 import 경로에 맞는 위치에 복사
# src/save/save.service.ts의 '../../../shared' → /app/shared
COPY shared-deploy/ /app/shared/

# 빌드
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/server/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/server/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
