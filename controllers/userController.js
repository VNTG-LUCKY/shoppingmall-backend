const User = require('../models/User');
const bcrypt = require('bcryptjs');

// CREATE - 새 유저 생성
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    // 필수 필드 검증
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '이름, 이메일, 비밀번호는 필수 입력 항목입니다.',
      });
    }

    // 이메일 소문자 변환 및 정리
    const normalizedEmail = email.trim().toLowerCase();

    // 이메일 중복 확인
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 이메일입니다.',
      });
    }

    // 비밀번호 암호화
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || undefined,
      address: address || undefined,
      role: role || 'user',
    });

    const savedUser = await user.save();
    
    // 비밀번호 제외하고 응답
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: '유저가 성공적으로 생성되었습니다.',
      data: userResponse,
    });
  } catch (error) {
    console.error('유저 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '유저 생성 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};


// READ - 모든 유저 조회
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '유저 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// READ - 특정 유저 조회 (ID로)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 유저 ID입니다.',
      });
    }
    res.status(500).json({
      success: false,
      message: '유저 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// UPDATE - 유저 정보 수정
exports.updateUser = async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) {
      // 이메일 변경 시 중복 확인
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '이미 존재하는 이메일입니다.',
        });
      }
      updateData.email = email;
    }
    if (password) {
      // 비밀번호 암호화
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '유저 정보가 성공적으로 수정되었습니다.',
      data: user,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 유저 ID입니다.',
      });
    }
    res.status(500).json({
      success: false,
      message: '유저 수정 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// DELETE - 유저 삭제
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '유저를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '유저가 성공적으로 삭제되었습니다.',
      data: {},
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 유저 ID입니다.',
      });
    }
    res.status(500).json({
      success: false,
      message: '유저 삭제 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

