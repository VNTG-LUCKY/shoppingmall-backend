const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 디버깅: 라우트 로드 확인
console.log('✅ Order 라우터 로드 완료');

// 모든 주문 라우트는 인증이 필요합니다
router.use(authenticateToken);

// 디버깅: 라우트 등록 확인
console.log('✅ Order CRUD 라우트 등록:');
console.log('  [CREATE]');
console.log('    - POST /api/orders - 주문 생성 (인증 필요)');
console.log('  [READ]');
console.log('    - GET /api/orders/my - 내 주문 목록 (인증 필요)');
console.log('    - GET /api/orders/number/:orderNumber - 주문 번호로 조회 (인증 필요)');
console.log('    - GET /api/orders/:id - 주문 상세 조회 (인증 필요)');
console.log('    - GET /api/orders - 모든 주문 조회 (인증 필요, 관리자)');
console.log('  [UPDATE]');
console.log('    - PUT /api/orders/:id - 주문 정보 수정 (인증 필요, 관리자)');
console.log('    - PUT /api/orders/:id/status - 주문 상태 변경 (인증 필요, 관리자)');
console.log('    - PUT /api/orders/:id/cancel - 주문 취소 (인증 필요)');
console.log('  [DELETE]');
console.log('    - DELETE /api/orders/:id - 주문 삭제 (인증 필요, 관리자)');

// ============================================
// CREATE - 주문 생성
// ============================================
// POST /api/orders - 장바구니에서 주문 생성
router.post('/', orderController.createOrder);

// ============================================
// READ - 주문 조회
// ============================================
// GET /api/orders/my - 내 주문 목록 조회
router.get('/my', orderController.getMyOrders);

// GET /api/orders/number/:orderNumber - 주문 번호로 조회 (구체적인 라우트를 먼저 배치)
router.get('/number/:orderNumber', orderController.getOrderByNumber);

// GET /api/orders - 모든 주문 조회 (관리자용, 동적 라우트보다 먼저 배치)
router.get('/', requireAdmin, orderController.getAllOrders);

// GET /api/orders/:id - 주문 상세 조회 (동적 라우트는 마지막에 배치)
router.get('/:id', orderController.getOrderById);

// ============================================
// UPDATE - 주문 수정
// ============================================
// PUT /api/orders/:id - 주문 정보 수정 (관리자용)
router.put('/:id', requireAdmin, orderController.updateOrder);

// PUT /api/orders/:id/status - 주문 상태 변경 (관리자용)
router.put('/:id/status', requireAdmin, orderController.updateOrderStatus);

// PUT /api/orders/:id/cancel - 주문 취소
router.put('/:id/cancel', orderController.cancelOrder);

// ============================================
// DELETE - 주문 삭제
// ============================================
// DELETE /api/orders/:id - 주문 삭제 (관리자용, 완전 삭제)
router.delete('/:id', requireAdmin, orderController.deleteOrder);

module.exports = router;

