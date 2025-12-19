const Product = require('../models/Product');
const mongoose = require('mongoose');

// CREATE - 새 상품 생성
exports.createProduct = async (req, res) => {
  // MongoDB 연결 상태 확인
  if (mongoose.connection.readyState !== 1) {
    console.error('❌ MongoDB 연결 상태:', mongoose.connection.readyState);
    console.error('  0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting');
    return res.status(503).json({
      success: false,
      message: '데이터베이스에 연결할 수 없습니다. 서버 관리자에게 문의하세요.',
    });
  }

  try {
    const { productCode, name, price, category, image, description } = req.body;

    // 필수 필드 검증
    if (!productCode || !name || !price || !category || !image) {
      return res.status(400).json({
        success: false,
        message: '상품코드, 상품이름, 상품가격, 카테고리, 이미지는 필수 입력 항목입니다.',
      });
    }

    // 상품코드 대문자 변환 및 정리
    const normalizedProductCode = productCode.trim().toUpperCase();

    // 상품코드 중복 확인
    const existingProduct = await Product.findOne({ productCode: normalizedProductCode });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 상품코드입니다.',
      });
    }

    // 가격 검증
    if (price < 0) {
      return res.status(400).json({
        success: false,
        message: '상품가격은 0 이상이어야 합니다.',
      });
    }

    const product = new Product({
      productCode: normalizedProductCode,
      name: name.trim(),
      price: Number(price),
      category: category.trim(),
      image: image.trim(),
      description: description ? description.trim() : '',
    });

    console.log('📦 상품 저장 시도:', {
      productCode: normalizedProductCode,
      name: name.trim(),
      price: Number(price),
      category: category.trim(),
    });

    const savedProduct = await product.save();

    console.log('✅ 상품 저장 성공:', {
      _id: savedProduct._id,
      productCode: savedProduct.productCode,
      name: savedProduct.name,
      collection: savedProduct.constructor.modelName, // 모델 이름 확인
    });

    res.status(201).json({
      success: true,
      message: '상품이 성공적으로 생성되었습니다.',
      data: savedProduct,
    });
  } catch (error) {
    console.error('❌ 상품 생성 오류:', error);
    console.error('오류 상세:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    // Mongoose 검증 오류 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.error('검증 오류:', messages);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: messages,
      });
    }

    // 중복 키 오류 처리
    if (error.code === 11000) {
      console.error('중복 키 오류:', error.keyPattern);
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 상품코드입니다.',
      });
    }

    res.status(500).json({
      success: false,
      message: '상품 생성 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// READ - 모든 상품 조회
exports.getAllProducts = async (req, res) => {
  try {
    const { category, page = 1, limit = 10, sort = '-createdAt' } = req.query;
    
    // 쿼리 조건 생성
    const query = {};
    if (category) {
      query.category = category;
    }

    // 페이지네이션
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 상품 조회
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // 전체 개수 조회
    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: products,
    });
  } catch (error) {
    console.error('상품 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '상품 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// READ - 특정 상품 조회 (ID로)
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 상품 ID입니다.',
      });
    }
    res.status(500).json({
      success: false,
      message: '상품 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// READ - 상품코드로 상품 조회
exports.getProductByCode = async (req, res) => {
  try {
    const productCode = req.params.code.toUpperCase();
    const product = await Product.findOne({ productCode });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '상품 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// UPDATE - 상품 정보 수정
exports.updateProduct = async (req, res) => {
  try {
    const { productCode, name, price, category, image, description } = req.body;
    const updateData = {};

    // 상품코드 변경 시 중복 확인
    if (productCode) {
      const normalizedProductCode = productCode.trim().toUpperCase();
      const existingProduct = await Product.findOne({ 
        productCode: normalizedProductCode, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: '이미 존재하는 상품코드입니다.',
        });
      }
      updateData.productCode = normalizedProductCode;
    }

    if (name) updateData.name = name.trim();
    if (price !== undefined) {
      if (price < 0) {
        return res.status(400).json({
          success: false,
          message: '상품가격은 0 이상이어야 합니다.',
        });
      }
      updateData.price = Number(price);
    }
    if (category) updateData.category = category.trim();
    if (image) updateData.image = image.trim();
    if (description !== undefined) updateData.description = description.trim();

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '상품 정보가 성공적으로 수정되었습니다.',
      data: product,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 상품 ID입니다.',
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: messages,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '이미 존재하는 상품코드입니다.',
      });
    }

    res.status(500).json({
      success: false,
      message: '상품 수정 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// DELETE - 상품 삭제
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '상품이 성공적으로 삭제되었습니다.',
      data: {},
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 상품 ID입니다.',
      });
    }
    res.status(500).json({
      success: false,
      message: '상품 삭제 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// 상품코드 자동 생성
exports.generateProductCode = async (req, res) => {
  try {
    // 가장 최근 상품코드를 가져옴 (내림차순 정렬)
    const lastProduct = await Product.findOne()
      .sort({ productCode: -1 })
      .select('productCode');

    let nextCode = 'BG001'; // 기본값

    if (lastProduct && lastProduct.productCode) {
      // 상품코드에서 숫자 부분 추출 (예: BG001 -> 001)
      const match = lastProduct.productCode.match(/(\d+)$/);
      if (match) {
        const number = parseInt(match[1], 10);
        const nextNumber = number + 1;
        // 3자리 숫자로 포맷팅 (001, 002, ...)
        nextCode = `BG${String(nextNumber).padStart(3, '0')}`;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        productCode: nextCode,
      },
    });
  } catch (error) {
    console.error('상품코드 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '상품코드 생성 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

