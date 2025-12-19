# Express.js Backend Server Dockerfile
FROM node:22-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 모든 의존성 설치 (프로덕션 + 개발)
RUN npm ci

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 5000

# 환경 변수 설정 (Cloudtype에서 주입됨)
ENV NODE_ENV=production

# 헬스체크 (선택사항)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 서버 시작
CMD ["node", "index.js"]

