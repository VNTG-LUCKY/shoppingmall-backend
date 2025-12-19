const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 환경 변수 확인 및 경고
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
  console.warn('⚠️  JWT_SECRET이 설정되지 않았거나 기본값을 사용 중입니다. 프로덕션 환경에서는 반드시 변경하세요.');
}

const connectDB = require('./config/database');

const app = express();

// MongoDB 연결 상태 추적
let isMongoConnected = false;

// MongoDB 연결 (비동기이므로 await 없이 호출)
connectDB()
  .then(conn => {
    isMongoConnected = true;
    console.log('✅ MongoDB 연결 완료 - 데이터베이스:', conn.connection.name);
  })
  .catch(err => {
    console.error('❌ MongoDB 연결 실패:', err);
    console.error('⚠️  서버는 실행되지만 MongoDB 없이는 데이터를 저장할 수 없습니다.');
    isMongoConnected = false;
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'Shopping Mall Server API' });
});

// API 라우트 (예시)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// User 라우트
const userRoutes = require('./routes/user');
app.use('/api/users', userRoutes);

// Auth 라우트
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Product 라우트
const productRoutes = require('./routes/product');
app.use('/api/products', productRoutes);

// Cart 라우트
try {
  const cartRoutes = require('./routes/cart');
  app.use('/api/cart', cartRoutes);
  console.log('✅ Cart 라우트 등록 완료: /api/cart');
} catch (error) {
  console.error('❌ Cart 라우트 등록 실패:', error);
}

// Order 라우트
try {
  const orderRoutes = require('./routes/order');
  app.use('/api/orders', orderRoutes);
  console.log('✅ Order 라우트 등록 완료: /api/orders');
} catch (error) {
  console.error('❌ Order 라우트 등록 실패:', error);
}

// 디버깅: 등록된 라우트 확인
console.log('✅ Product 라우트 등록 완료: /api/products');

// 모든 등록된 라우트 확인
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`  ${middleware.route.stack[0].method.toUpperCase()} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    console.log(`  Router: ${middleware.regexp}`);
  }
});

// 서버 시작
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// 포트 충돌 에러 처리
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('다음 중 하나를 시도하세요:');
    console.error(`1. 포트 ${PORT}를 사용하는 프로세스를 종료하세요`);
    console.error(`2. 다른 포트를 사용하세요: PORT=5001 npm run dev`);
    process.exit(1);
  } else {
    throw err;
  }
});


