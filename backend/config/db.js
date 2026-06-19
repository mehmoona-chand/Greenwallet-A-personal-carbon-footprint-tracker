// config/db.js
// MongoDB connection with retry logic and event monitoring

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser:    true,
      useUnifiedTopology: true,
      // Auto-index only in development (saves performance in prod)
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Monitor connection events
    mongoose.connection.on('error', err => {
      logger.error(`MongoDB error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected ✅');
    });

  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    // Exit process — server is useless without DB
    process.exit(1);
  }
};

module.exports = connectDB;
