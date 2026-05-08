import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-issues',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  DUPLICATE_CHECK_RADIUS: 100, // meters
  DUPLICATE_CHECK_HOURS: 24,
  AUTHORITY_APPROVAL_DAYS: 3,
  NODE_ENV: process.env.NODE_ENV || 'development'
};
