// utils/logger.js
// Production-grade logging with Winston
// Logs to console in dev, to files in production
// SECURITY: never logs passwords, tokens or sensitive data

const winston = require('winston');
const path    = require('path');

// Custom format — strips any accidental sensitive fields
const sanitizeLog = winston.format((info) => {
  const SENSITIVE = ['password','token','secret','apiKey','authorization','cookie'];
  const sanitize  = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const out = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      if (SENSITIVE.some(s => key.toLowerCase().includes(s))) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = sanitize(obj[key]);
      }
    }
    return out;
  };

  if (info.meta)    info.meta    = sanitize(info.meta);
  if (info.data)    info.data    = sanitize(info.data);
  if (info.message) info.message = info.message.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
  return info;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: winston.format.combine(
    sanitizeLog(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console — always on
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) =>
          `${timestamp} [${level}]: ${message}`
        )
      )
    }),
    // Error file — only errors
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level:    'error',
      maxsize:  5242880,  // 5MB
      maxFiles: 5,
    }),
    // Combined file — all logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize:  10485760, // 10MB
      maxFiles: 10,
    }),
  ],
  // Do not exit on uncaught exceptions
  exitOnError: false,
});

// Create logs directory if it doesn't exist
const fs   = require('fs');
const dir  = path.join(__dirname, '../logs');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

module.exports = logger;
