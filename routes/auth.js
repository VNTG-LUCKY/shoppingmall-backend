const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// 로그인
router.post('/login', authController.login);

// 현재 사용자 정보 조회 (인증 필요)
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;





