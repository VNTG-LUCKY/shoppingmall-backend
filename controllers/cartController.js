const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// 장바구니 총 금액 계산 헬퍼 함수
const calculateTotalAmount = (items) => {
  return items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
};

// GET - 현재 사용자의 장바구니 조회
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    // active 상태의 장바구니 찾기 (없으면 생성)
    let cart = await Cart.findOne({ user: userId, status: 'active' })
      .populate('items.product', 'name price image category productCode');

    // 장바구니가 없으면 새로 생성
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalAmount: 0,
        status: 'active',
      });
      await cart.save();
    } else {
      // 총 금액 재계산
      cart.totalAmount = calculateTotalAmount(cart.items);
      await cart.save();
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error('장바구니 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '장바구니 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// POST - 장바구니에 상품 추가
exports.addItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1 } = req.body;

    console.log('장바구니 추가 요청:', { userId, productId, quantity });

    // 필수 필드 검증
    if (!productId) {
      console.log('상품 ID 누락');
      return res.status(400).json({
        success: false,
        message: '상품 ID는 필수 입력 항목입니다.',
      });
    }

    // 수량 검증
    if (quantity < 1) {
      console.log('수량 검증 실패:', quantity);
      return res.status(400).json({
        success: false,
        message: '수량은 최소 1개 이상이어야 합니다.',
      });
    }

    // 상품 존재 확인
    const product = await Product.findById(productId);
    if (!product) {
      console.log('상품을 찾을 수 없음:', productId);
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.',
      });
    }

    console.log('상품 확인 완료:', product.name);

    // 장바구니 찾기 또는 생성
    let cart = await Cart.findOne({ user: userId, status: 'active' });

    if (!cart) {
      console.log('새 장바구니 생성');
      cart = new Cart({
        user: userId,
        items: [],
        totalAmount: 0,
        status: 'active',
      });
    } else {
      console.log('기존 장바구니 찾음:', cart._id);
    }

    // 이미 같은 상품이 장바구니에 있는지 확인
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // 이미 있으면 수량만 증가
      cart.items[existingItemIndex].quantity += quantity;
      // 가격은 최신 가격으로 업데이트
      cart.items[existingItemIndex].price = product.price;
    } else {
      // 없으면 새로 추가
      cart.items.push({
        product: productId,
        quantity: quantity,
        price: product.price,
      });
    }

    // 총 금액 계산 및 저장
    cart.totalAmount = calculateTotalAmount(cart.items);
    
    console.log('장바구니 저장 시도:', {
      userId,
      itemsCount: cart.items.length,
      totalAmount: cart.totalAmount
    });
    
    await cart.save();
    console.log('장바구니 저장 완료');

    // populate로 상품 정보 포함하여 반환
    await cart.populate('items.product', 'name price image category productCode');

    console.log('장바구니 추가 성공');
    res.status(200).json({
      success: true,
      message: '장바구니에 상품이 추가되었습니다.',
      data: cart,
    });
  } catch (error) {
    console.error('장바구니 추가 오류 상세:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 상품 ID입니다.',
      });
    }

    // MongoDB 중복 키 에러 처리 (unique 인덱스)
    if (error.code === 11000) {
      console.error('중복 키 에러:', error.keyPattern);
      return res.status(409).json({
        success: false,
        message: '장바구니 생성 중 충돌이 발생했습니다. 다시 시도해주세요.',
        error: error.message,
      });
    }

    console.error('장바구니 추가 오류:', error);
    res.status(500).json({
      success: false,
      message: '장바구니에 상품을 추가하는 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// PUT - 장바구니 항목 수량 수정
exports.updateItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    // 필수 필드 검증
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: '상품 ID는 필수 입력 항목입니다.',
      });
    }

    if (quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: '수량은 필수 입력 항목입니다.',
      });
    }

    // 수량 검증
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: '수량은 최소 1개 이상이어야 합니다.',
      });
    }

    // 장바구니 찾기
    const cart = await Cart.findOne({ user: userId, status: 'active' });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: '장바구니를 찾을 수 없습니다.',
      });
    }

    // 항목 찾기 (productId로 찾기)
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '장바구니에 해당 상품이 없습니다.',
      });
    }

    // 수량 업데이트
    cart.items[itemIndex].quantity = quantity;

    // 상품 가격 최신화 (상품 정보 가져오기)
    const product = await Product.findById(productId);
    if (product) {
      cart.items[itemIndex].price = product.price;
    }

    // 총 금액 계산 및 저장
    cart.totalAmount = calculateTotalAmount(cart.items);
    await cart.save();

    // populate로 상품 정보 포함하여 반환
    await cart.populate('items.product', 'name price image category productCode');

    res.status(200).json({
      success: true,
      message: '장바구니 항목이 수정되었습니다.',
      data: cart,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 상품 ID입니다.',
      });
    }

    console.error('장바구니 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '장바구니 항목을 수정하는 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// DELETE - 장바구니에서 항목 삭제
exports.removeItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    // 장바구니 찾기
    const cart = await Cart.findOne({ user: userId, status: 'active' });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: '장바구니를 찾을 수 없습니다.',
      });
    }

    // 항목 찾기 (productId로 찾기)
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '장바구니에 해당 상품이 없습니다.',
      });
    }

    // 항목 삭제
    cart.items.splice(itemIndex, 1);

    // 총 금액 계산 및 저장
    cart.totalAmount = calculateTotalAmount(cart.items);
    await cart.save();

    // populate로 상품 정보 포함하여 반환
    await cart.populate('items.product', 'name price image category productCode');

    res.status(200).json({
      success: true,
      message: '장바구니에서 항목이 삭제되었습니다.',
      data: cart,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 상품 ID입니다.',
      });
    }

    console.error('장바구니 항목 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '장바구니 항목을 삭제하는 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// DELETE - 장바구니 비우기
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 장바구니 찾기
    const cart = await Cart.findOne({ user: userId, status: 'active' });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: '장바구니를 찾을 수 없습니다.',
      });
    }

    // 모든 항목 삭제
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    res.status(200).json({
      success: true,
      message: '장바구니가 비워졌습니다.',
      data: cart,
    });
  } catch (error) {
    console.error('장바구니 비우기 오류:', error);
    res.status(500).json({
      success: false,
      message: '장바구니를 비우는 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

