const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 로그인
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 필수 필드 검증
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '이메일과 비밀번호를 입력해주세요.',
      });
    }

    // 이메일 소문자 변환 및 정리
    const normalizedEmail = email.trim().toLowerCase();

    // 사용자 찾기
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // JWT 토큰 생성
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role || 'user'
    };

    // JWT_SECRET이 .env에서 로드되었는지 확인
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'your-secret-key-change-in-production') {
      console.warn('⚠️  JWT_SECRET이 .env 파일에 설정되지 않았습니다. 기본값을 사용합니다.');
    }

    const token = jwt.sign(
      tokenPayload,
      jwtSecret || 'your-secret-key-change-in-production',
      { 
        expiresIn: process.env.JWT_EXPIRE || '7d',
        issuer: 'shoping-mall-api',
        audience: 'shoping-mall-client'
      }
    );

    // 비밀번호 제외하고 응답
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: '로그인에 성공했습니다.',
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRE || '7d',
      data: userResponse,
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// 현재 사용자 정보 조회 (토큰 검증 필요)
exports.getMe = async (req, res) => {
  try {
    // 미들웨어에서 req.user에 토큰에서 추출한 사용자 정보가 추가됨
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: '인증 정보가 유효하지 않습니다.',
      });
    }

    // 데이터베이스에서 최신 사용자 정보 조회
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '사용자 정보를 성공적으로 조회했습니다.',
      data: user,
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    
    // CastError 처리 (잘못된 ID 형식)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 사용자 ID입니다.',
      });
    }

    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

