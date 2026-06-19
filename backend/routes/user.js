// routes/user.js — secured profile management

const express     = require('express');
const { body, validationResult } = require('express-validator');
const User        = require('../models/User');
const Calculation = require('../models/Calculation');
const { protect } = require('../middleware/auth');
const logger      = require('../utils/logger');

const router = express.Router();
router.use(protect);

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  return null;
};

// ════════════════════════════════════════════
// GET /api/user/profile
// ════════════════════════════════════════════
router.get('/profile', async (req, res) => {
  try {
    const user  = await User.findById(req.user._id);
    const calcs = await Calculation
      .find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const co2s       = calcs.map(c => c.totalCO2);
    const avgCO2     = co2s.length ? co2s.reduce((a,b)=>a+b,0)/co2s.length : 0;
    const totalTrees = calcs.reduce((a,c) => a + (c.treesPerYear||0), 0);

    res.status(200).json({
      success: true,
      user: {
        id:        user._id,
        name:      user.name,
        email:     user.email,
        location:  user.location,
        dailyGoal: user.dailyGoal,
        level:     user.level,
        xp:        user.xp,
        streak:    user.streak,
        createdAt: user.createdAt,
        authProvider: user.authProvider,
      },
      stats: {
        totalEntries: calcs.length,
        avgCO2:       parseFloat(avgCO2.toFixed(2)),
        totalTrees:   parseFloat(totalTrees.toFixed(1)),
        latestCO2:    calcs[0]?.totalCO2 || 0,
        latestDate:   calcs[0]?.date || null,
      },
    });
  } catch (error) {
    logger.error(`Profile error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ════════════════════════════════════════════
// PUT /api/user/profile — update name/location/goal
// ════════════════════════════════════════════
router.put('/profile',
  [
    body('name').optional().trim().escape()
      .isLength({ min:2, max:50 }).withMessage('Name must be 2–50 characters'),
    body('location').optional().trim().escape()
      .isLength({ max:100 }).withMessage('Location too long'),
    body('dailyGoal').optional()
      .isFloat({ min:0.5, max:50 }).withMessage('Goal must be 0.5–50 kg'),
  ],
  async (req, res) => {
    const err = validate(req, res); if (err) return;
    try {
      const user = await User.findById(req.user._id);
      if (req.body.name)      user.name      = req.body.name;
      if (req.body.location)  user.location  = req.body.location;
      if (req.body.dailyGoal) user.dailyGoal = req.body.dailyGoal;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Profile updated',
        user: {
          id: user._id, name: user.name, email: user.email,
          location: user.location, dailyGoal: user.dailyGoal,
          level: user.level, xp: user.xp,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Update failed' });
    }
  }
);

// ════════════════════════════════════════════
// PUT /api/user/change-password
// ════════════════════════════════════════════
router.put('/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min:6, max:128 }).withMessage('New password must be 6–128 chars')
      .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
      .withMessage('Must contain at least one letter and one number'),
  ],
  async (req, res) => {
    const err = validate(req, res); if (err) return;

    // Block Google users from changing password
    if (req.user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Google accounts cannot set a password here. Use Google settings.',
      });
    }

    try {
      const user    = await User.findById(req.user._id).select('+password');
      const isMatch = await user.matchPassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }

      // Prevent reusing same password
      const isSame = await user.matchPassword(req.body.newPassword);
      if (isSame) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password',
        });
      }

      user.password = req.body.newPassword;
      await user.save();

      logger.info(`Password changed: userId=${req.user._id}`);
      res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Password change failed' });
    }
  }
);

// ════════════════════════════════════════════
// DELETE /api/user/account
// Permanently deletes account + all data
// ════════════════════════════════════════════
router.delete('/account',
  [body('password').notEmpty().withMessage('Password required to delete account')],
  async (req, res) => {
    const err = validate(req, res); if (err) return;

    if (req.user.authProvider !== 'google') {
      const user    = await User.findById(req.user._id).select('+password');
      const isMatch = await user.matchPassword(req.body.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect password' });
      }
    }

    try {
      await Calculation.deleteMany({ userId: req.user._id });
      await User.findByIdAndDelete(req.user._id);
      logger.info(`Account deleted: userId=${req.user._id}`);
      res.status(200).json({ success: true, message: 'Account permanently deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Account deletion failed' });
    }
  }
);

module.exports = router;
