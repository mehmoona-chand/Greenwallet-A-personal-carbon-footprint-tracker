// models/User.js
// Hardened user model with:
// - bcrypt hashing (cost factor 12)
// - Account lockout after failed logins
// - Login attempt tracking
// - Password reset tokens
// - Input length limits

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      minlength: [2,  'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
      // Strip any HTML from name
      set: v => v.replace(/<[^>]*>/g, '').trim(),
    },

    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      maxlength: [100, 'Email too long'],
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      index:     true,
    },

    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      maxlength: [128, 'Password too long'],
      select:    false,  // Never returned in queries
    },

    // Profile
    location:  { type: String, default: 'Lahore, Pakistan', maxlength: 100, trim: true },
    dailyGoal: { type: Number, default: 5.0, min: 0.5, max: 50 },

    // Gamification
    level:  { type: Number, default: 1, min: 1 },
    xp:     { type: Number, default: 0, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    lastLogDate: { type: Date, default: null },

    // Google OAuth
    googleId:    { type: String, sparse: true, index: true },
    authProvider:{ type: String, enum: ['local', 'google'], default: 'local' },

    // ── SECURITY FIELDS ──────────────────────────

    // Track failed login attempts
    loginAttempts: { type: Number, default: 0 },

    // Lock account until this time
    lockUntil: { type: Date, default: null },

    // Is account currently locked?
    isLocked: { type: Boolean, default: false },

    // Password reset token (hashed)
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },

    // Email verification
    isEmailVerified:     { type: Boolean, default: true }, // true for MVP
    emailVerifyToken:    { type: String,  select: false },

    // Last IP (for suspicious activity detection)
    lastLoginIP:  { type: String, default: '' },
    lastLoginAt:  { type: Date,   default: null },

    // Account active flag
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── INDEX for performance ─────────────────────
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 }, { sparse: true });

// ── PRE-SAVE: Hash password ───────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // Cost factor 12 — strong but not too slow
  const salt    = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── METHOD: Compare password ──────────────────
UserSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

// ── METHOD: Handle failed login ───────────────
UserSchema.methods.handleFailedLogin = async function () {
  this.loginAttempts += 1;

  const MAX = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const LOCK = parseInt(process.env.LOCK_TIME_MINUTES) || 15;

  if (this.loginAttempts >= MAX) {
    this.isLocked  = true;
    this.lockUntil = new Date(Date.now() + LOCK * 60 * 1000);
  }

  await this.save({ validateBeforeSave: false });
};

// ── METHOD: Reset login attempts on success ───
UserSchema.methods.handleSuccessfulLogin = async function (ip) {
  this.loginAttempts = 0;
  this.isLocked      = false;
  this.lockUntil     = null;
  this.lastLoginIP   = ip || '';
  this.lastLoginAt   = new Date();
  await this.save({ validateBeforeSave: false });
};

// ── METHOD: Generate password reset token ─────
UserSchema.methods.generatePasswordResetToken = function () {
  // Create random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash it before storing (never store plain tokens in DB)
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Expires in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return unhashed token (sent to user's email)
  return resetToken;
};

// ── VIRTUAL: Check if locked ──────────────────
UserSchema.virtual('accountLocked').get(function () {
  return this.isLocked && this.lockUntil > Date.now();
});

module.exports = mongoose.model('User', UserSchema);
