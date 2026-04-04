FROM node:20-slim AS builder
WORKDIR /app/server

COPY package*.json ./
RUN npm ci
COPY . .
COPY shared-deploy/ /app/shared/
RUN npm run build

FROM node:20-slim
WORKDIR /app/server
COPY --from=builder /app/server/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/server/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
