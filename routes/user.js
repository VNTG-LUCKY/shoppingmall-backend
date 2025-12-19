const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// CREATE - 새 유저 생성
router.post('/', userController.createUser);

// READ - 모든 유저 조회
router.get('/', userController.getAllUsers);

// READ - 특정 유저 조회 (ID로)
router.get('/:id', userController.getUserById);

// UPDATE - 유저 정보 수정
router.put('/:id', userController.updateUser);

// DELETE - 유저 삭제
router.delete('/:id', userController.deleteUser);

module.exports = router;

