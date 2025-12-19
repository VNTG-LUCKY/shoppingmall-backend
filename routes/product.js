const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 디버깅: 라우트 로드 확인
console.log('✅ Product 라우터 로드 완료');

// 중요: 구체적인 라우트를 동적 라우트보다 먼저 정의해야 합니다!

// 상품코드 자동 생성 (가장 구체적인 라우트) - Admin만 접근 가능
router.get('/generate-code', authenticateToken, requireAdmin, productController.generateProductCode);

// 상품코드로 상품 조회 (구체적인 라우트) - 모든 사용자 접근 가능
router.get('/code/:code', productController.getProductByCode);

// CREATE - 새 상품 생성 - Admin만 접근 가능
router.post('/', authenticateToken, requireAdmin, productController.createProduct);

// READ - 모든 상품 조회 (쿼리 파라미터: category, page, limit, sort) - 모든 사용자 접근 가능
// 예: GET /api/products?category=전략&page=1&limit=10&sort=-createdAt
router.get('/', productController.getAllProducts);

// READ - 특정 상품 조회 (ID로) - 동적 라우트는 마지막에 배치 - 모든 사용자 접근 가능
router.get('/:id', productController.getProductById);

// UPDATE - 상품 정보 수정 - Admin만 접근 가능
router.put('/:id', authenticateToken, requireAdmin, productController.updateProduct);

// DELETE - 상품 삭제 - Admin만 접근 가능
router.delete('/:id', authenticateToken, requireAdmin, productController.deleteProduct);

module.exports = router;

