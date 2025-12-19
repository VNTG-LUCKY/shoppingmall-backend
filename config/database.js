const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MONGODB_ATLAS_URL을 우선 사용, 없으면 로컬 주소 사용
    const mongoURI = process.env.MONGODB_ATLAS_URL || 'mongodb://localhost:27017/shoping-mall';
    
    if (process.env.MONGODB_ATLAS_URL) {
      console.log(`🌐 MongoDB Atlas 연결 시도 중...`);
    } else {
      console.log(`💻 로컬 MongoDB 연결 시도 중: ${mongoURI}`);
    }
    
    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB 연결 성공: ${conn.connection.host}`);
    console.log(`📊 데이터베이스 이름: ${conn.connection.name}`);
    console.log(`📋 사용 가능한 컬렉션:`, (await conn.connection.db.listCollections().toArray()).map(c => c.name));
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB 연결 실패: ${error.message}`);
    if (process.env.MONGODB_ATLAS_URL) {
      console.error('MongoDB Atlas 연결을 확인해주세요.');
    } else {
      console.error('로컬 MongoDB가 실행 중인지 확인해주세요.');
    }
    // 서버는 계속 실행되도록 하되, 연결 실패를 알림
    throw error;
  }
};

module.exports = connectDB;


