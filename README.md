# Shopping Mall Server

Node.js, Express, MongoDB를 사용한 쇼핑몰 서버 프로젝트입니다.

## 설치 방법

1. 의존성 설치
```bash
npm install
```

2. 환경 변수 설정

`server` 폴더에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# MongoDB 연결 URI
MONGODB_URI=mongodb://localhost:27017/shoping-mall

# 서버 포트
PORT=5000

# JWT 비밀키 (프로덕션에서는 반드시 강력한 비밀키로 변경하세요)
JWT_SECRET=your-secret-key-change-in-production

# JWT 토큰 만료 시간 (예: 7d, 24h, 1h)
JWT_EXPIRE=7d
```

**중요**: `JWT_SECRET`은 프로덕션 환경에서 반드시 강력한 비밀키로 변경하세요!

3. 서버 실행
```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 프로덕션 모드
npm start
```

## 환경 변수

- `MONGODB_URI`: MongoDB 연결 URI (기본값: mongodb://localhost:27017/shoping-mall)
- `PORT`: 서버 포트 (기본값: 5000)
- `JWT_SECRET`: JWT 토큰 서명용 비밀키 (기본값: your-secret-key-change-in-production)
- `JWT_EXPIRE`: JWT 토큰 만료 시간 (기본값: 7d)

## 프로젝트 구조

```
server/
├── config/
│   └── database.js      # MongoDB 연결 설정
├── server.js            # Express 서버 진입점
├── package.json
└── .env                 # 환경 변수 (git에 포함되지 않음)
```


