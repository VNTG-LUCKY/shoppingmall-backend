const mongoose = require('mongoose');

// 주문 상품 정보 (스냅샷)
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productCode: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productImage: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, '수량은 최소 1개 이상이어야 합니다'],
    },
    price: {
      // 주문 당시의 상품 가격(스냅샷)
      type: Number,
      required: true,
      min: [0, '가격은 0 이상이어야 합니다'],
    },
    subtotal: {
      // 상품 가격 * 수량
      type: Number,
      required: true,
      min: [0, '소계는 0 이상이어야 합니다'],
    },
  },
  {
    _id: false,
  }
);

// 주문 스키마
const orderSchema = new mongoose.Schema(
  {
    // 주문 번호 (고유 번호, 예: ORD-20251216-001)
    // pre('save')에서 자동 생성되므로 required는 false로 설정
    orderNumber: {
      type: String,
      required: false,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    
    // 주문자 정보
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // 주문 상품 목록
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function(items) {
          return items && items.length > 0;
        },
        message: '주문 상품이 최소 1개 이상 필요합니다',
      },
    },
    
    // 배송 정보
    shipping: {
      recipientName: {
        type: String,
        required: [true, '수령인 이름을 입력해주세요'],
        trim: true,
      },
      recipientPhone: {
        type: String,
        required: [true, '수령인 전화번호를 입력해주세요'],
        trim: true,
      },
      postalCode: {
        type: String,
        required: [true, '우편번호를 입력해주세요'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, '주소를 입력해주세요'],
        trim: true,
      },
      detailAddress: {
        type: String,
        trim: true,
        default: '',
      },
      shippingRequest: {
        type: String,
        enum: ['문 앞', '직접 받고 부재 시 문 앞', '경비실', '택배함', '기타'],
        default: '문 앞',
      },
      shippingMemo: {
        type: String,
        trim: true,
        default: '',
      },
    },
    
    // 주문 금액 정보
    amount: {
      itemsTotal: {
        // 상품 합계
        type: Number,
        required: true,
        min: [0, '상품 합계는 0 이상이어야 합니다'],
      },
      shippingFee: {
        // 배송비
        type: Number,
        required: true,
        min: [0, '배송비는 0 이상이어야 합니다'],
        default: 0,
      },
      discount: {
        // 할인 금액
        type: Number,
        required: true,
        min: [0, '할인 금액은 0 이상이어야 합니다'],
        default: 0,
      },
      total: {
        // 총 결제 금액 (itemsTotal + shippingFee - discount)
        type: Number,
        required: true,
        min: [0, '총 결제 금액은 0 이상이어야 합니다'],
      },
    },
    
    // 결제 정보
    payment: {
      method: {
        type: String,
        enum: ['카드', '계좌이체', '무통장입금', '가상계좌', '휴대폰결제', '간편결제'],
        required: [true, '결제 방법을 선택해주세요'],
      },
      status: {
        type: String,
        enum: ['대기', '완료', '실패', '취소', '환불'],
        default: '대기',
        required: true,
      },
      paidAt: {
        type: Date,
        default: null,
      },
      paymentId: {
        // 외부 결제 시스템의 결제 ID (PG사 결제 ID 등)
        type: String,
        trim: true,
        default: null,
      },
      paymentInfo: {
        // 추가 결제 정보 (JSON 형태로 저장)
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    
    // 주문 상태
    status: {
      type: String,
      enum: [
        '주문접수',      // 주문이 접수됨
        '결제대기',      // 결제 대기 중
        '결제완료',      // 결제 완료
        '배송준비',      // 배송 준비 중
        '배송중',        // 배송 중
        '배송완료',      // 배송 완료
        '주문취소',      // 주문 취소
        '환불처리중',    // 환불 처리 중
        '환불완료',      // 환불 완료
      ],
      default: '주문접수',
      required: true,
      index: true,
    },
    
    // 배송 정보
    delivery: {
      trackingNumber: {
        // 운송장 번호
        type: String,
        trim: true,
        default: null,
      },
      carrier: {
        // 배송사 (예: CJ대한통운, 한진택배 등)
        type: String,
        trim: true,
        default: null,
      },
      shippedAt: {
        // 배송 시작 일시
        type: Date,
        default: null,
      },
      deliveredAt: {
        // 배송 완료 일시
        type: Date,
        default: null,
      },
    },
    
    // 포인트 적립 정보
    points: {
      earned: {
        // 적립된 포인트
        type: Number,
        default: 0,
        min: [0, '적립 포인트는 0 이상이어야 합니다'],
      },
      used: {
        // 사용한 포인트
        type: Number,
        default: 0,
        min: [0, '사용 포인트는 0 이상이어야 합니다'],
      },
    },
    
    // 메모 및 요청사항
    memo: {
      type: String,
      trim: true,
      default: '',
    },
    
    // 취소/환불 정보
    cancellation: {
      reason: {
        type: String,
        trim: true,
        default: null,
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      processedAt: {
        type: Date,
        default: null,
      },
      refundAmount: {
        type: Number,
        default: null,
      },
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// 인덱스 설정
orderSchema.index({ user: 1, createdAt: -1 }); // 사용자별 주문 조회
orderSchema.index({ orderNumber: 1 }); // 주문 번호로 조회 (unique 인덱스는 이미 있음)
orderSchema.index({ status: 1, createdAt: -1 }); // 상태별 주문 조회
orderSchema.index({ 'payment.status': 1 }); // 결제 상태별 조회

// 주문 번호 자동 생성 미들웨어 (pre-save: 새 문서일 때만 생성)
orderSchema.pre('save', async function(next) {
  // 새 문서이고 orderNumber가 없을 때만 생성
  if (this.isNew && !this.orderNumber) {
    try {
      // 주문 번호 형식: ORD-YYYYMMDD-XXX (예: ORD-20251216-001)
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      
      // 오늘 날짜의 주문 개수 확인 (orderNumber로 확인)
      // 동시성 문제를 방지하기 위해 최대 10번 재시도
      let orderNumber;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const todayOrderNumberPattern = `ORD-${dateStr}-`;
        const count = await mongoose.model('Order').countDocuments({
          orderNumber: { $regex: `^${todayOrderNumberPattern}` },
        });
        
        const sequence = String(count + 1).padStart(3, '0');
        orderNumber = `ORD-${dateStr}-${sequence}`;
        
        // 중복 확인
        const existingOrder = await mongoose.model('Order').findOne({ orderNumber });
        if (!existingOrder) {
          break; // 사용 가능한 번호를 찾았음
        }
        
        attempts++;
        console.warn(`⚠️ 주문 번호 중복 감지, 재시도 ${attempts}/${maxAttempts}: ${orderNumber}`);
        
        // 짧은 지연 후 재시도
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('주문 번호 생성 실패: 최대 재시도 횟수 초과');
      }
      
      this.orderNumber = orderNumber;
      console.log('✅ 주문 번호 생성 완료:', this.orderNumber);
    } catch (error) {
      console.error('❌ 주문 번호 생성 오류:', error);
      return next(new Error(`주문 번호 생성 실패: ${error.message}`));
    }
  }
  
  // 저장 전에 orderNumber가 있는지 확인 (새 문서인 경우)
  if (this.isNew && !this.orderNumber) {
    return next(new Error('주문 번호가 생성되지 않았습니다.'));
  }
  
  next();
});

// 총 결제 금액 자동 계산
orderSchema.pre('save', function(next) {
  if (this.isModified('amount.itemsTotal') || 
      this.isModified('amount.shippingFee') || 
      this.isModified('amount.discount')) {
    this.amount.total = this.amount.itemsTotal + this.amount.shippingFee - this.amount.discount;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

// 디버깅: 모델 정보 확인
console.log('📦 Order 모델 로드 완료 - 컬렉션 이름: orders');

module.exports = Order;

