// server.js — GreenWallet Backend
// 100% complete with all security layers
// ─────────────────────────────────────────────
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express   = require('express');
const cors      = require('cors');
const morgan    = require('morgan');
const dotenv    = require('dotenv');
const path      = require('path');

// Load env FIRST before anything else
dotenv.config();

const connectDB = require('./config/db');
const logger    = require('./utils/logger');

const {
  helmetConfig,
  globalLimiter,
  mongoSanitizer,
  xssCleaner,
  hppProtection,
  bodySizeLimit,
  corsConfig,
  suspicionDetector,
} = require('./middleware/security');

// Connect to MongoDB
connectDB();

const app = express();

// ══════════════════════════════════════════════
// SECURITY MIDDLEWARE — ORDER MATTERS
// Applied before any routes
// ══════════════════════════════════════════════

// 1. Helmet — security headers (first!)
app.use(helmetConfig);

// 2. CORS — only allow whitelisted origins
app.use(cors(corsConfig));

// 3. Body parser with size limit (10kb max)
app.use(express.json({ limit: bodySizeLimit }));
app.use(express.urlencoded({ extended: true, limit: bodySizeLimit }));

// 4. MongoDB injection sanitizer
app.use(mongoSanitizer);

// 5. XSS cleaner — strip malicious HTML from inputs
app.use(xssCleaner);

// 6. HTTP Parameter Pollution protection
app.use(hppProtection);

// 7. Global rate limiter — 100 req / 15 min per IP
app.use(globalLimiter);

// 8. Attack pattern detector
app.use(suspicionDetector);

// 9. Request logging (console only, no sensitive data)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production: log to file via Winston
  app.use(morgan('combined', {
    stream: { write: msg => logger.info(msg.trim()) },
    // Skip logging health checks (reduces noise)
    skip: (req) => req.path === '/api/health',
  }));
}

// 10. Trust proxy (needed when deployed behind Nginx/Heroku)
app.set('trust proxy', 1);

// ══════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/calculations', require('./routes/calculations'));
app.use('/api/user',         require('./routes/user'));
app.use('/api/stats',        require('./routes/stats'));
app.use('/api/ai',           require('./routes/ai'));

// ── Health check ────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🌿 GreenWallet API is running!',
    version: '2.0.0',
    security: 'production-grade',
    endpoints: {
      auth:         '/api/auth',
      calculations: '/api/calculations',
      user:         '/api/user',
      stats:        '/api/stats',
      ai:           '/api/ai',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    status:    'healthy',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()) + 's',
    env:       process.env.NODE_ENV,
  });
});

// ══════════════════════════════════════════════
// ERROR HANDLERS
// ══════════════════════════════════════════════

// 404 — unknown route
app.use('*', (req, res) => {
  logger.warn(`404: ${req.method} ${req.originalUrl} IP=${req.ip}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler — never exposes stack traces in production
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message} | Stack: ${err.stack}`);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages[0] });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: 'Duplicate value. Please use different credentials.' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  // CORS error
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ success: false, message: 'CORS: Origin not allowed' });
  }

  // Generic — never expose internal details in production
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message,
  });
});

// ══════════════════════════════════════════════
// UNCAUGHT EXCEPTION HANDLERS
// Prevents server crash from unexpected errors
// ══════════════════════════════════════════════
process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`);
  logger.error(err.stack);
  // Give logger time to write, then exit
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`UNHANDLED REJECTION: ${reason}`);
  setTimeout(() => process.exit(1), 1000);
});

// Graceful shutdown on SIGTERM (Docker/Heroku sends this)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// ── START ────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info('');
  logger.info('🌿 ══════════════════════════════════');
  logger.info('🌿  GreenWallet API v2.0 Running');
  logger.info(`🌿  Port:     ${PORT}`);
  logger.info(`🌿  Env:      ${process.env.NODE_ENV}`);
  logger.info(`🌿  URL:      http://localhost:${PORT}`);
  logger.info('🌿  Security: ALL 10 LAYERS ACTIVE ✅');
  logger.info('🌿 ══════════════════════════════════');
  logger.info('');
});

module.exports = server;
