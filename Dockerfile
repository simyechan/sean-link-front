# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 먼저 복사 (레이어 캐싱 최적화)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# 소스 복사 및 빌드
COPY . .
RUN yarn build

# ── Stage 2: Production (Nginx) ──────────────────────────────────
FROM nginx:1.25-alpine AS production

# 빌드 결과물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 포트 노출
EXPOSE 80

# Nginx 시작 (daemon off: 포그라운드 실행)
CMD ["nginx", "-g", "daemon off;"]
