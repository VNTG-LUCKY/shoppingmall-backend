const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productCode: {
    type: String,
    required: [true, '상품코드를 입력해주세요'],
    unique: true,
    trim: true,
    uppercase: true, // 상품코드를 대문자로 저장
  },
  name: {
    type: String,
    required: [true, '상품이름을 입력해주세요'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, '상품가격을 입력해주세요'],
    min: [0, '상품가격은 0 이상이어야 합니다'],
  },
  category: {
    type: String,
    required: [true, '카테고리를 선택해주세요'],
    enum: {
      values: ['파티', '가족', '전략', '악세사리'],
      message: '카테고리는 파티, 가족, 전략, 악세사리 중 하나여야 합니다',
    },
  },
  image: {
    type: String,
    required: [true, '이미지를 입력해주세요'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true, // createdAt, updatedAt 자동 생성
});

// 인덱스 설정 (unique: true가 이미 인덱스를 생성하므로 중복 제거)
// 카테고리로 검색 시 성능 향상을 위한 인덱스
productSchema.index({ category: 1 });

// 모델 생성 시 컬렉션 이름 명시 (소문자 복수형: products)
const Product = mongoose.model('Product', productSchema);

// 디버깅: 모델 정보 확인
console.log('📦 Product 모델 로드 완료 - 컬렉션 이름: products');

module.exports = Product;

