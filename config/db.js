import mongoose from 'mongoose';
import { config } from './config.js';

export const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('MongoDB disconnection error:', error.message);
  }
};
