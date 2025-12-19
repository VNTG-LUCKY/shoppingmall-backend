const mongoose = require('mongoose');

// 장바구니에 담긴 개별 상품 정보
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, '수량은 최소 1개 이상이어야 합니다'],
      default: 1,
    },
    price: {
      // 담았을 당시의 상품 가격(스냅샷)
      type: Number,
      required: true,
      min: [0, '가격은 0 이상이어야 합니다'],
    },
  },
  {
    _id: false,
  }
);

// 장바구니 스키마
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    // 장바구니 전체 합계 금액(선택 사항, 추후 사용을 위해 필드만 추가)
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, '총 금액은 0 이상이어야 합니다'],
    },
    // 장바구니 상태 (향후 주문 연동 대비)
    status: {
      type: String,
      enum: ['active', 'ordered', 'abandoned'],
      default: 'active',
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// 한 명의 유저당 하나의 active 장바구니만 유지하도록 유니크 인덱스
cartSchema.index({ user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;


