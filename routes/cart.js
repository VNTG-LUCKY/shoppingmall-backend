const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// 디버깅: 라우트 로드 확인
console.log('✅ Cart 라우터 로드 완료');

// 테스트 라우트 (인증 없이) - 라우트 등록 확인용
router.get('/test', (req, res) => {
  res.json({ message: 'Cart 라우트가 정상적으로 작동합니다!' });
});

// 모든 장바구니 라우트는 인증이 필요합니다
router.use(authenticateToken);

// 디버깅: 라우트 등록 확인
console.log('✅ Cart 라우트 등록:');
console.log('  - GET /api/cart/test (인증 불필요)');
console.log('  - GET /api/cart (인증 필요)');
console.log('  - POST /api/cart/items (인증 필요)');
console.log('  - PUT /api/cart/items/:productId (인증 필요)');
console.log('  - DELETE /api/cart/items/:productId (인증 필요)');
console.log('  - DELETE /api/cart (인증 필요)');

// GET - 현재 사용자의 장바구니 조회
router.get('/', cartController.getCart);

// POST - 장바구니에 상품 추가
router.post('/items', (req, res, next) => {
  console.log('📦 POST /api/cart/items 요청 받음');
  console.log('요청 본문:', req.body);
  next();
}, cartController.addItem);

// PUT - 장바구니 항목 수량 수정 (productId 사용)
router.put('/items/:productId', cartController.updateItem);

// DELETE - 장바구니에서 항목 삭제 (productId 사용)
router.delete('/items/:productId', cartController.removeItem);

// DELETE - 장바구니 비우기
router.delete('/', cartController.clearCart);

module.exports = router;

