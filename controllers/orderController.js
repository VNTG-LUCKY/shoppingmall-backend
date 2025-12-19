const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// POST - 주문 생성 (장바구니에서 주문)
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      shipping,
      payment,
      pointsUsed = 0,
      memo = '',
    } = req.body;

    // 배송 정보 검증
    if (!shipping || !shipping.recipientName || !shipping.recipientPhone || 
        !shipping.postalCode || !shipping.address) {
      return res.status(400).json({
        success: false,
        message: '배송 정보를 모두 입력해주세요.',
      });
    }

    // 결제 방법 검증
    if (!payment || !payment.method) {
      return res.status(400).json({
        success: false,
        message: '결제 방법을 선택해주세요.',
      });
    }

    // ============================================
    // 결제 검증 및 중복 주문 체크
    // ============================================
    
    // 포트원 결제 ID가 있는 경우 (무통장입금 제외)
    if (payment.paymentId && payment.method !== '무통장입금') {
      const impUid = payment.paymentId;
      
      // 1. 주문 중복 체크: 같은 imp_uid로 이미 주문이 생성되었는지 확인
      const existingOrder = await Order.findOne({ 
        'payment.paymentId': impUid,
        user: userId,
      });
      
      if (existingOrder) {
        console.warn('⚠️ 중복 주문 시도 감지:', {
          userId,
          impUid,
          existingOrderId: existingOrder._id,
          existingOrderNumber: existingOrder.orderNumber,
        });
        
        return res.status(409).json({
          success: false,
          message: '이미 처리된 결제입니다.',
          data: {
            orderId: existingOrder._id,
            orderNumber: existingOrder.orderNumber,
          },
        });
      }
      
      // 2. 포트원 결제 검증
      try {
        console.log('🔍 포트원 결제 검증 시작:', { impUid });
        
        // 포트원 Access Token 발급
        const tokenResponse = await axios.post('https://api.iamport.kr/users/getToken', {
          imp_key: process.env.PORTONE_REST_API_KEY || 'imp41006245', // 포트원 REST API Key
          imp_secret: process.env.PORTONE_REST_API_SECRET || '', // 포트원 REST API Secret
        });
        
        if (!tokenResponse.data || !tokenResponse.data.response || !tokenResponse.data.response.access_token) {
          throw new Error('포트원 Access Token 발급 실패');
        }
        
        const accessToken = tokenResponse.data.response.access_token;
        
        // 포트원 결제 정보 조회
        const paymentResponse = await axios.get(`https://api.iamport.kr/payments/${impUid}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (!paymentResponse.data || !paymentResponse.data.response) {
          throw new Error('포트원 결제 정보 조회 실패');
        }
        
        const portOnePayment = paymentResponse.data.response;
        
        console.log('✅ 포트원 결제 검증 성공:', {
          imp_uid: portOnePayment.imp_uid,
          status: portOnePayment.status,
          amount: portOnePayment.amount,
          merchant_uid: portOnePayment.merchant_uid,
        });
        
        // 결제 상태 검증
        if (portOnePayment.status !== 'paid') {
          return res.status(400).json({
            success: false,
            message: `결제가 완료되지 않았습니다. (상태: ${portOnePayment.status})`,
          });
        }
        
        // 포트원에서 받은 결제 정보를 paymentInfo에 저장 (나중에 금액 검증에 사용)
        if (!payment.paymentInfo) {
          payment.paymentInfo = {};
        }
        payment.paymentInfo.verified_amount = portOnePayment.amount; // 검증된 결제 금액
        payment.paymentInfo.verified_status = portOnePayment.status; // 검증된 결제 상태
        
      } catch (error) {
        console.error('❌ 포트원 결제 검증 오류:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        
        // 포트원 API 오류인 경우
        if (error.response) {
          return res.status(400).json({
            success: false,
            message: `결제 검증 실패: ${error.response.data?.message || error.message}`,
          });
        }
        
        // 네트워크 오류 등
        return res.status(500).json({
          success: false,
          message: '결제 검증 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        });
      }
    }

    // 장바구니 조회
    const cart = await Cart.findOne({ user: userId, status: 'active' })
      .populate('items.product', 'name price image category productCode');

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '장바구니가 비어있습니다.',
      });
    }

    // populate가 제대로 되었는지 확인 (상품이 삭제되었을 수 있음)
    const invalidItems = cart.items.filter(item => !item.product || typeof item.product === 'object' && !item.product._id);
    if (invalidItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: '장바구니에 존재하지 않는 상품이 포함되어 있습니다. 장바구니를 확인해주세요.',
      });
    }

    // 주문 상품 정보 생성 (스냅샷)
    const orderItems = cart.items.map(item => {
      const product = item.product;
      
      // 상품 정보 검증
      if (!product) {
        throw new Error('장바구니에 존재하지 않는 상품이 포함되어 있습니다.');
      }
      
      if (!product.productCode || !product.name || !product.image) {
        throw new Error(`상품 정보가 불완전합니다. (상품코드: ${product.productCode}, 이름: ${product.name}, 이미지: ${product.image})`);
      }
      
      return {
        product: product._id,
        productCode: product.productCode,
        productName: product.name,
        productImage: product.image,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      };
    });

    // 금액 계산
    const itemsTotal = cart.totalAmount;
    const shippingFee = itemsTotal >= 50000 ? 0 : 3000; // 5만원 이상 무료배송
    const discount = pointsUsed || 0;
    const total = itemsTotal + shippingFee - discount;

    // 포인트 적립 계산 (구매 금액의 1%)
    const pointsEarned = Math.floor(total * 0.01);

    // ============================================
    // 결제 금액 검증 (포트원 결제인 경우)
    // ============================================
    if (payment.paymentId && payment.method !== '무통장입금' && payment.paymentInfo) {
      // 포트원에서 검증된 금액이 있으면 그것을 사용, 없으면 클라이언트에서 전달한 금액 사용
      const paidAmount = payment.paymentInfo.verified_amount || 
                        payment.paymentInfo.paid_amount || 
                        payment.paymentInfo.amount;
      
      if (paidAmount && paidAmount !== total) {
        console.error('❌ 결제 금액 불일치:', {
          paidAmount,
          calculatedTotal: total,
          difference: Math.abs(paidAmount - total),
          paymentInfo: payment.paymentInfo,
        });
        
        return res.status(400).json({
          success: false,
          message: `결제 금액이 일치하지 않습니다. (결제금액: ${paidAmount.toLocaleString()}원, 주문금액: ${total.toLocaleString()}원)`,
        });
      }
      
      console.log('✅ 결제 금액 검증 통과:', {
        paidAmount,
        calculatedTotal: total,
      });
    }

    // 주문 생성
    console.log('📦 주문 생성 시작:', {
      userId,
      itemsCount: orderItems.length,
      total,
      paymentMethod: payment.method,
    });

    const order = new Order({
      user: userId,
      items: orderItems,
      shipping: {
        recipientName: shipping.recipientName.trim(),
        recipientPhone: shipping.recipientPhone.trim(),
        postalCode: shipping.postalCode.trim(),
        address: shipping.address.trim(),
        detailAddress: shipping.detailAddress ? shipping.detailAddress.trim() : '',
        shippingRequest: shipping.shippingRequest || '문 앞',
        shippingMemo: shipping.shippingMemo ? shipping.shippingMemo.trim() : '',
      },
      amount: {
        itemsTotal,
        shippingFee,
        discount,
        total,
      },
      payment: {
        method: payment.method,
        status: payment.method === '무통장입금' ? '대기' : '완료', // 무통장입금은 대기, 나머지는 완료로 가정
        paidAt: payment.method === '무통장입금' ? null : new Date(),
        paymentId: payment.paymentId || null,
        paymentInfo: payment.paymentInfo || null,
      },
      status: payment.method === '무통장입금' ? '결제대기' : '결제완료',
      points: {
        earned: pointsEarned,
        used: pointsUsed,
      },
      memo: memo.trim(),
    });

    console.log('💾 주문 저장 시도...');
    await order.save();
    console.log('✅ 주문 저장 성공:', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
    });

    // 장바구니 상태를 'ordered'로 변경
    cart.status = 'ordered';
    await cart.save();

    // populate로 상품 정보 포함
    await order.populate('items.product', 'name price image category productCode');
    await order.populate('user', 'name email phone');

    console.log('주문 생성 완료:', order.orderNumber);

    res.status(201).json({
      success: true,
      message: '주문이 성공적으로 생성되었습니다.',
      data: order,
    });
  } catch (error) {
    console.error('❌ 주문 생성 오류:', error);
    console.error('에러 상세:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      stack: error.stack,
      errors: error.errors,
    });
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.error('Validation 에러 상세:', messages);
      return res.status(400).json({
        success: false,
        message: '주문 정보가 유효하지 않습니다.',
        errors: messages,
      });
    }

    // 중복 키 오류 (unique constraint 위반)
    if (error.code === 11000) {
      console.error('중복 키 오류:', error.keyPattern);
      return res.status(400).json({
        success: false,
        message: '주문 번호가 중복되었습니다. 다시 시도해주세요.',
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || '주문 생성 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// GET - 내 주문 목록 조회
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 쿼리 조건
    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    // 주문 조회
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('items.product', 'name price image category productCode');

    // 전체 개수
    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: orders,
    });
  } catch (error) {
    console.error('주문 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '주문 목록 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// GET - 주문 상세 조회
exports.getOrderById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    // 주문 조회
    const order = await Order.findById(id)
      .populate('items.product', 'name price image category productCode')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
    }

    // 본인 주문이거나 관리자인지 확인
    if (!isAdmin && order.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '주문 조회 권한이 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 주문 ID입니다.',
      });
    }

    console.error('주문 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '주문 상세 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// GET - 주문 번호로 조회
exports.getOrderByNumber = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderNumber } = req.params;
    const isAdmin = req.user.role === 'admin';

    // 주문 조회
    const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase() })
      .populate('items.product', 'name price image category productCode')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
    }

    // 본인 주문이거나 관리자인지 확인
    if (!isAdmin && order.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '주문 조회 권한이 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('주문 번호 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '주문 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// GET - 모든 주문 조회 (관리자용)
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, startDate, endDate } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 쿼리 조건
    const query = {};
    if (status) {
      query.status = status;
    }
    if (paymentStatus) {
      query['payment.status'] = paymentStatus;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // 주문 조회
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('items.product', 'name price image category productCode')
      .populate('user', 'name email phone');

    // 전체 개수
    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: orders,
    });
  } catch (error) {
    console.error('주문 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '주문 목록 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// PUT - 주문 상태 변경 (관리자용)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, carrier } = req.body;

    // 주문 조회
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
    }

    // 상태 변경
    if (status) {
      const validStatuses = [
        '주문접수', '결제대기', '결제완료', '배송준비', '배송중', 
        '배송완료', '주문취소', '환불처리중', '환불완료'
      ];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: '유효하지 않은 주문 상태입니다.',
        });
      }

      order.status = status;

      // 배송 중으로 변경 시 배송 정보 업데이트
      if (status === '배송중' && trackingNumber) {
        order.delivery.trackingNumber = trackingNumber;
        order.delivery.carrier = carrier || null;
        order.delivery.shippedAt = new Date();
      }

      // 배송 완료로 변경 시
      if (status === '배송완료') {
        order.delivery.deliveredAt = new Date();
      }
    }

    await order.save();

    // populate로 상품 정보 포함
    await order.populate('items.product', 'name price image category productCode');
    await order.populate('user', 'name email phone');

    res.status(200).json({
      success: true,
      message: '주문 상태가 변경되었습니다.',
      data: order,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 주문 ID입니다.',
      });
    }

    console.error('주문 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '주문 상태 변경 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// PUT - 주문 정보 수정 (관리자용)
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      shipping,
      payment,
      memo,
      points,
    } = req.body;

    // 주문 조회
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
    }

    // 배송 정보 업데이트
    if (shipping) {
      if (shipping.recipientName) order.shipping.recipientName = shipping.recipientName.trim();
      if (shipping.recipientPhone) order.shipping.recipientPhone = shipping.recipientPhone.trim();
      if (shipping.postalCode) order.shipping.postalCode = shipping.postalCode.trim();
      if (shipping.address) order.shipping.address = shipping.address.trim();
      if (shipping.detailAddress !== undefined) order.shipping.detailAddress = shipping.detailAddress.trim();
      if (shipping.shippingRequest) order.shipping.shippingRequest = shipping.shippingRequest;
      if (shipping.shippingMemo !== undefined) order.shipping.shippingMemo = shipping.shippingMemo.trim();
    }

    // 결제 정보 업데이트
    if (payment) {
      if (payment.method) order.payment.method = payment.method;
      if (payment.status) order.payment.status = payment.status;
      if (payment.paymentId !== undefined) order.payment.paymentId = payment.paymentId;
      if (payment.paymentInfo !== undefined) order.payment.paymentInfo = payment.paymentInfo;
      if (payment.paidAt !== undefined) order.payment.paidAt = payment.paidAt ? new Date(payment.paidAt) : null;
    }

    // 메모 업데이트
    if (memo !== undefined) {
      order.memo = memo.trim();
    }

    // 포인트 정보 업데이트
    if (points) {
      if (points.earned !== undefined) order.points.earned = points.earned;
      if (points.used !== undefined) order.points.used = points.used;
    }

    await order.save();

    // populate로 상품 정보 포함
    await order.populate('items.product', 'name price image category productCode');
    await order.populate('user', 'name email phone');

    res.status(200).json({
      success: true,
      message: '주문 정보가 수정되었습니다.',
      data: order,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 주문 ID입니다.',
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '주문 정보가 유효하지 않습니다.',
        errors: messages,
      });
    }

    console.error('주문 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '주문 수정 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// DELETE - 주문 삭제 (관리자용, 완전 삭제)
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // 주문 조회
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
    }

    // 삭제 가능한 상태인지 확인 (배송 완료된 주문은 삭제 불가)
    const nonDeletableStatuses = ['배송중', '배송완료'];
    if (nonDeletableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: '배송 중이거나 배송 완료된 주문은 삭제할 수 없습니다. 취소 기능을 사용해주세요.',
      });
    }

    // 주문 삭제
    await Order.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: '주문이 삭제되었습니다.',
      data: {},
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 주문 ID입니다.',
      });
    }

    console.error('주문 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '주문 삭제 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// PUT - 주문 취소
exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { reason } = req.body;
    const isAdmin = req.user.role === 'admin';

    // 주문 조회
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
    }

    // 본인 주문이거나 관리자인지 확인
    if (!isAdmin && order.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '주문 취소 권한이 없습니다.',
      });
    }

    // 취소 가능한 상태인지 확인
    const cancellableStatuses = ['주문접수', '결제대기', '결제완료', '배송준비'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: '취소할 수 없는 주문 상태입니다.',
      });
    }

    // 주문 취소 처리
    order.status = '주문취소';
    order.cancellation = {
      reason: reason || '고객 요청',
      requestedAt: new Date(),
    };

    // 결제 상태도 취소로 변경
    if (order.payment.status === '완료') {
      order.payment.status = '취소';
    }

    await order.save();

    // populate로 상품 정보 포함
    await order.populate('items.product', 'name price image category productCode');
    await order.populate('user', 'name email phone');

    res.status(200).json({
      success: true,
      message: '주문이 취소되었습니다.',
      data: order,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 주문 ID입니다.',
      });
    }

    console.error('주문 취소 오류:', error);
    res.status(500).json({
      success: false,
      message: '주문 취소 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

