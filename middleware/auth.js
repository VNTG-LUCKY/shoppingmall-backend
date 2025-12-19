const jwt = require('jsonwebtoken');

// JWT 토큰 검증 미들웨어
exports.authenticateToken = (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN 형식

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.',
      });
    }

    // JWT_SECRET이 .env에서 로드되었는지 확인
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    // 토큰 검증
    jwt.verify(
      token,
      jwtSecret,
      (err, decoded) => {
        if (err) {
          return res.status(403).json({
            success: false,
            message: '유효하지 않거나 만료된 토큰입니다.',
          });
        }

        // 검증된 사용자 정보를 req.user에 추가
        req.user = decoded;
        next();
      }
    );
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    return res.status(500).json({
      success: false,
      message: '토큰 검증 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// Admin 권한 확인 미들웨어
exports.requireAdmin = (req, res, next) => {
  // authenticateToken 미들웨어를 먼저 실행해야 함
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다.',
    });
  }

  // Admin 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다.',
    });
  }

  next();
};

