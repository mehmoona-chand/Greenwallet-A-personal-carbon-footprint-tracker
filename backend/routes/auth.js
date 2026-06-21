// routes/auth.js
// Hardened auth: register, login (with lockout),
// logout (token blacklist), password reset, Google OAuth

const express  = require('express');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { body, validationResult } = require('express-validator');

const User        = require('../models/User');
const { protect, blacklistToken } = require('../middleware/auth');
const { authLimiter, speedLimiter } = require('../middleware/security');
const { sendEmail, passwordResetEmail } = require('../utils/email');
const logger      = require('../utils/logger');

const router = express.Router();

// ── HELPER: Generate JWT ──────────────────────
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn:  process.env.JWT_EXPIRE || '30d',
    algorithm:  'HS256',
  });

// ── HELPER: Safe user response (no sensitive fields) ──
const safeUser = (user) => ({
  id:        user._id,
  name:      user.name,
  email:     user.email,
  location:  user.location,
  dailyGoal: user.dailyGoal,
  level:     user.level,
  xp:        user.xp,
  streak:    user.streak,
  authProvider: user.authProvider,
});

// ── VALIDATION RULES ──────────────────────────
const registerRules = [
  body('name')
    .trim()
    .escape()                         // sanitize HTML
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be 2–50 characters'),
  body('email')
    .normalizeEmail()
    .isEmail()
    .withMessage('Enter a valid email')
    .isLength({ max: 100 })
    .withMessage('Email too long'),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6–128 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
    .withMessage('Password must contain at least one letter and one number'),
];

const loginRules = [
  body('email').normalizeEmail().isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password required')
    .isLength({ max: 128 }).withMessage('Invalid input'),
];

// ── VALIDATE HELPER ───────────────────────────
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }
  return null;
};

// ════════════════════════════════════════════
// POST /api/auth/register
// Rate-limited + validated + sanitized
// ════════════════════════════════════════════
router.post('/register',
  authLimiter,
  speedLimiter,
  registerRules,
  async (req, res) => {
    const err = validate(req, res); if (err) return;

    const { name, email, password } = req.body;

    try {
      // Check duplicate email
      const exists = await User.findOne({ email }).lean();
      if (exists) {
        // Don't reveal whether email is registered (prevents user enumeration)
        return res.status(400).json({
          success: false,
          message: 'Registration failed. Check your details and try again.',
        });
      }

      const user  = await User.create({ name, email, password });
      const token = generateToken(user._id);

      logger.info(`New user registered: ${email} IP:${req.ip}`);

      res.status(201).json({ success: true, token, user: safeUser(user) });

    } catch (error) {
      logger.error(`Register error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
  }
);

// ════════════════════════════════════════════
// POST /api/auth/login
// Rate-limited + lockout + timing-safe
// ════════════════════════════════════════════
router.post('/login',
  authLimiter,
  speedLimiter,
  loginRules,
  async (req, res) => {
    const err = validate(req, res); if (err) return;

    const { email, password } = req.body;

    try {
      // Always fetch from DB (include password and lock fields)
      const user = await User.findOne({ email })
        .select('+password +loginAttempts +lockUntil +isLocked');

      // SECURITY: Use identical error for wrong email and wrong password
      // This prevents attackers from learning which emails are registered
      const GENERIC_ERROR = 'Invalid email or password';

      if (!user || user.authProvider === 'google') {
        // Simulate bcrypt delay to prevent timing attacks
        await bcrypt.compare('dummy', '$2a$12$dummy.hash.to.prevent.timing.attacks.padding');
        return res.status(401).json({ success: false, message: GENERIC_ERROR });
      }

      // Check account lock
      if (user.isLocked && user.lockUntil > Date.now()) {
        const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
        logger.warn(`Locked account login attempt: ${email} IP:${req.ip}`);
        return res.status(423).json({
          success: false,
          message: `Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account disabled. Contact support.' });
      }

      // Verify password
      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
        await user.handleFailedLogin();
        const remaining = Math.max(0,
          (parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5) - user.loginAttempts - 1
        );
        logger.warn(`Failed login: ${email} IP:${req.ip} Attempts:${user.loginAttempts + 1}`);
        return res.status(401).json({
          success: false,
          message: remaining > 0
            ? `${GENERIC_ERROR}. ${remaining} attempts remaining before lockout.`
            : 'Account locked due to too many failed attempts. Try again in 15 minutes.',
        });
      }

      // Success — reset attempts, update login record
      await user.handleSuccessfulLogin(req.ip);

      const token = generateToken(user._id);
      logger.info(`User logged in: ${email} IP:${req.ip}`);

      res.status(200).json({ success: true, token, user: safeUser(user) });

    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
  }
);

// ════════════════════════════════════════════
// POST /api/auth/logout
// Blacklists the token so it can't be reused
// ════════════════════════════════════════════
router.post('/logout', protect, async (req, res) => {
  try {
    blacklistToken(req.token);
    logger.info(`User logged out: ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// ════════════════════════════════════════════
// GET /api/auth/me
// Returns current user (protected)
// ════════════════════════════════════════════
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, user: safeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ════════════════════════════════════════════
// POST /api/auth/forgot-password
// Sends reset link to email
// ════════════════════════════════════════════
router.post('/forgot-password',
  authLimiter,
  [body('email').normalizeEmail().isEmail().withMessage('Enter a valid email')],
  async (req, res) => {
    const err = validate(req, res); if (err) return;

    const { email } = req.body;

    // ALWAYS return success — prevents email enumeration attacks
    const SUCCESS = {
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    };

    try {
      const user = await User.findOne({ email });
      if (!user || user.authProvider === 'google') {
        return res.status(200).json(SUCCESS);
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;
      const sent     = await sendEmail({
        to:      user.email,
        subject: 'GreenWallet — Reset Your Password',
        html:    passwordResetEmail(user.name, resetUrl),
      });

      if (!sent) {
        user.passwordResetToken   = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
      }

      logger.info(`Password reset requested: ${email} IP:${req.ip}`);
      res.status(200).json(SUCCESS);

    } catch (error) {
      logger.error(`Forgot password error: ${error.message}`);
      res.status(200).json(SUCCESS); // Still return success
    }
  }
);

// ════════════════════════════════════════════
// POST /api/auth/reset-password/:token
// Validates token and sets new password
// ════════════════════════════════════════════
router.post('/reset-password/:token',
  authLimiter,
  [body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6–128 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
    .withMessage('Password must contain at least one letter and one number')
  ],
  async (req, res) => {
    const err = validate(req, res); if (err) return;

    try {
      // Hash the incoming token to compare with stored hash
      const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      const user = await User.findOne({
        passwordResetToken:   hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      }).select('+passwordResetToken +passwordResetExpires');

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Reset link is invalid or has expired. Please request a new one.',
        });
      }

      // Set new password and clear reset fields
      user.password             = req.body.password;
      user.passwordResetToken   = undefined;
      user.passwordResetExpires = undefined;
      user.loginAttempts        = 0;
      user.isLocked             = false;
      user.lockUntil            = null;
      await user.save();

      logger.info(`Password reset successful: ${user.email} IP:${req.ip}`);
      res.status(200).json({ success: true, message: 'Password reset successfully. Please log in.' });

    } catch (error) {
      logger.error(`Reset password error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Password reset failed. Please try again.' });
    }
  }
);

// ════════════════════════════════════════════
// POST /api/auth/google
// Google OAuth — verifies the access token by
// asking Google's own userinfo endpoint who it
// belongs to. This works with the popup-based
// OAuth flow (initTokenClient) on the frontend,
// which is more reliable than the FedCM-based
// One Tap flow (prompt()) we used before.
// ════════════════════════════════════════════
router.post('/google', authLimiter, async (req, res) => {
  const { access_token } = req.body;

  if (!access_token || typeof access_token !== 'string' || access_token.length > 4096) {
    return res.status(400).json({ success: false, message: 'Invalid Google credential' });
  }

  try {
    // Ask Google directly who this access token belongs to.
    // If the token is fake, expired, or for a different app, Google rejects it.
    const googleRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!googleRes.ok) {
      logger.warn(`Google userinfo rejected token: status=${googleRes.status} IP:${req.ip}`);
      return res.status(401).json({ success: false, message: 'Google authentication failed' });
    }

    const payload = await googleRes.json();

    if (!payload || !payload.email || !payload.sub) {
      return res.status(400).json({ success: false, message: 'Invalid Google token' });
    }

    // Find or create user
    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: payload.email }]
    });

    if (!user) {
      // New Google user — create account
      user = await User.create({
        name:         payload.name || payload.email.split('@')[0],
        email:        payload.email,
        googleId:     payload.sub,
        authProvider: 'google',
        password:     crypto.randomBytes(32).toString('hex'), // random unusable pw
        isEmailVerified: true,
      });
      logger.info(`New Google user: ${payload.email} IP:${req.ip}`);
    } else if (!user.googleId) {
      // Existing local account — link Google
      user.googleId     = payload.sub;
      user.authProvider = 'google';
      await user.save({ validateBeforeSave: false });
    }

    await user.handleSuccessfulLogin(req.ip);
    const token = generateToken(user._id);

    res.status(200).json({ success: true, token, user: safeUser(user) });

  } catch (error) {
    logger.error(`Google auth error: ${error.message}`);
    res.status(400).json({ success: false, message: 'Google authentication failed' });
  }
});

// Need bcrypt for the timing-safe dummy compare
const bcrypt = require('bcryptjs');

module.exports = router;

