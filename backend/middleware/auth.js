// middleware/auth.js
// JWT verification + token blacklist for real logout
// ─────────────────────────────────────────────

const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const logger = require('../utils/logger');

// In-memory token blacklist
// When a user logs out, their token is added here
// so it can never be reused even if it hasn't expired
// (In production with multiple servers, use Redis instead)
const blacklistedTokens = new Set();

// Cleanup old tokens every hour to prevent memory leak
setInterval(() => {
  // We can't check expiry without decoding, so we try-decode each
  for (const token of blacklistedTokens) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Token expired — safe to remove from blacklist
      blacklistedTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

// ── ADD TO BLACKLIST (called on logout) ──────────
const blacklistToken = (token) => {
  if (token) blacklistedTokens.add(token);
};

// ── PROTECT MIDDLEWARE ────────────────────────────
const protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Also accept token from cookie (extra security option)
  if (!token && req.cookies?.gwToken) {
    token = req.cookies.gwToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied — please log in',
    });
  }

  // Check if token was blacklisted (logged out)
  if (blacklistedTokens.has(token)) {
    return res.status(401).json({
      success: false,
      message: 'Session expired — please log in again',
    });
  }

  try {
    // Verify signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB (catches disabled accounts)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found',
      });
    }

    // Check if account is locked
    if (user.isLocked && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
      });
    }

    // Attach user and token to request
    req.user  = user;
    req.token = token;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired — please log in again',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      logger.warn(`Invalid JWT attempt: IP=${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid token — access denied',
      });
    }
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

module.exports = { protect, blacklistToken };
