// middleware/security.js
// ═══════════════════════════════════════════════
// ALL SECURITY LAYERS — applied in server.js
// This file is the shield of GreenWallet backend
// ═══════════════════════════════════════════════

const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const slowDown      = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss           = require('xss-clean');
const hpp           = require('hpp');
const logger        = require('../utils/logger');

// ──────────────────────────────────────────────
// LAYER 1 — HELMET
// Sets 15 security HTTP headers automatically
// Prevents: clickjacking, MIME sniffing, XSS via headers
// ──────────────────────────────────────────────
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      scriptSrc:  ["'self'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.anthropic.com'],
    },
  },
  // Prevent browsers from sniffing MIME type
  noSniff: true,
  // Prevent clickjacking with iframes
  frameguard: { action: 'deny' },
  // Force HTTPS
  hsts: {
    maxAge:            31536000,
    includeSubDomains: true,
    preload:           true,
  },
  // Hide Express server info
  hidePoweredBy: true,
  // Prevent XSS via IE
  xssFilter: true,
});

// ──────────────────────────────────────────────
// LAYER 2 — GLOBAL RATE LIMITER
// Max 100 requests per IP per 15 minutes
// Prevents: DDoS, scraping, general abuse
// ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,  // 15 minutes
  max:              100,              // requests per window
  standardHeaders:  true,
  legacyHeaders:    false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded: IP=${req.ip} Path=${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please wait 15 minutes and try again.',
    });
  },
});

// ──────────────────────────────────────────────
// LAYER 3 — AUTH-SPECIFIC RATE LIMITER
// Max 10 login/register attempts per 15 minutes
// Prevents: brute force password attacks
// ──────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      10,               // only 10 attempts
  skipSuccessfulRequests: true, // only count failures
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded: IP=${req.ip} Path=${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Your IP is blocked for 15 minutes.',
    });
  },
});

// ──────────────────────────────────────────────
// LAYER 4 — SLOW DOWN (speed limiter)
// After 5 requests, adds 500ms delay per request
// Prevents: automated bots (without hard blocking)
// ──────────────────────────────────────────────
const speedLimiter = slowDown({
  windowMs:       15 * 60 * 1000,
  delayAfter:     5,       // start slowing after 5 requests
  delayMs:        () => 500, // add 500ms per request above limit
  maxDelayMs:     5000,    // never delay more than 5 seconds
});

// ──────────────────────────────────────────────
// LAYER 5 — MongoDB INJECTION SANITIZER
// Strips $ and . from request body/params/query
// Prevents: NoSQL injection attacks
// Example attack blocked: { "email": { "$gt": "" } }
// ──────────────────────────────────────────────
const mongoSanitizer = mongoSanitize({
  replaceWith:       '_',
  allowDots:         false,
  onSanitize: ({ req, key }) => {
    logger.warn(`NoSQL injection attempt blocked: IP=${req.ip} Key=${key}`);
  },
});

// ──────────────────────────────────────────────
// LAYER 6 — XSS CLEANER
// Strips malicious HTML/JS from input fields
// Prevents: Cross-Site Scripting attacks
// Example attack blocked: <script>steal(document.cookie)</script>
// ──────────────────────────────────────────────
const xssCleaner = xss();

// ──────────────────────────────────────────────
// LAYER 7 — HPP (HTTP Parameter Pollution)
// Prevents duplicate parameter attacks
// Example attack blocked: ?sort=name&sort=password
// ──────────────────────────────────────────────
const hppProtection = hpp({
  // Allow these fields to have multiple values (legitimate)
  whitelist: ['categories'],
});

// ──────────────────────────────────────────────
// LAYER 8 — REQUEST SIZE LIMITER
// Max 10KB body — prevents payload attacks
// ──────────────────────────────────────────────
const bodySizeLimit = '10kb';

// ──────────────────────────────────────────────
// LAYER 9 — CORS CONFIG
// Only whitelisted origins can talk to the API
// ──────────────────────────────────────────────
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://greenwallet-frontend-l4h2.onrender.com',
  ];
  if (process.env.FRONTEND_URL) origins.push(process.env.FRONTEND_URL);
  return origins;
};

const corsConfig = {
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();
    // Allow requests with no origin (Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    logger.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials:      true,
  methods:          ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders:   ['Content-Type', 'Authorization'],
  exposedHeaders:   ['X-RateLimit-Remaining'],
  maxAge:           86400, // 24h preflight cache
};

// ──────────────────────────────────────────────
// LAYER 10 — SUSPICIOUS REQUEST DETECTOR
// Detects and logs obviously malicious patterns
// ──────────────────────────────────────────────
const suspicionDetector = (req, res, next) => {
  const body    = JSON.stringify(req.body || {});
  const query   = JSON.stringify(req.query || {});
  const params  = JSON.stringify(req.params || {});
  const all     = body + query + params;

  // Patterns that indicate attack attempts
  const ATTACK_PATTERNS = [
    /\$where/i,               // MongoDB JS injection
    /<script/i,               // XSS
    /javascript:/i,           // XSS via protocol
    /on\w+\s*=/i,            // inline event handlers
    /union\s+select/i,        // SQL injection
    /drop\s+table/i,          // SQL injection
    /exec\s*\(/i,             // code execution
    /eval\s*\(/i,             // eval injection
    /\.\.\//,                 // path traversal
    /\/etc\/passwd/i,         // path traversal
    /base64_decode/i,         // encoded payload
  ];

  const detected = ATTACK_PATTERNS.some(p => p.test(all));
  if (detected) {
    logger.warn(
      `⚠️  ATTACK PATTERN DETECTED: IP=${req.ip} ` +
      `Method=${req.method} Path=${req.path} ` +
      `UserAgent=${req.headers['user-agent']}`
    );
    return res.status(400).json({
      success: false,
      message: 'Invalid request — malicious content detected',
    });
  }

  next();
};

module.exports = {
  helmetConfig,
  globalLimiter,
  authLimiter,
  speedLimiter,
  mongoSanitizer,
  xssCleaner,
  hppProtection,
  bodySizeLimit,
  corsConfig,
  suspicionDetector,
};
