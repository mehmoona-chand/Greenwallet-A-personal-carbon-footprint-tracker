// routes/calculations.js — secured CRUD

const express     = require('express');
const { body, validationResult } = require('express-validator');
const Calculation = require('../models/Calculation');
const User        = require('../models/User');
const { protect } = require('../middleware/auth');
const logger      = require('../utils/logger');

const router = express.Router();
router.use(protect);

const LEVELS = [0, 100, 250, 500, 800, 1200, 1800, 2600];

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  return null;
};

// ── SAVE CALCULATION ──────────────────────────
router.post('/',
  [
    body('totalCO2').isFloat({ min: 0, max: 5000 }).withMessage('Invalid CO₂ value'),
    body('treesPerYear').optional().isFloat({ min: 0 }),
    body('categories').optional().isObject(),
    body('inputs.dietType').optional().isIn(['meat','mixed','vegetarian','vegan']),
  ],
  async (req, res) => {
    const err = validate(req, res); if (err) return;

    const { totalCO2, categories, inputs, treesPerYear, aiTip, date } = req.body;

    try {
      const calc = await Calculation.create({
        userId: req.user._id,
        totalCO2,
        categories:   categories   || {},
        inputs:       inputs       || {},
        treesPerYear: treesPerYear || 0,
        aiTip:        (aiTip || '').slice(0, 2000), // enforce max length
        date:         date || new Date().toLocaleDateString(),
      });

      // Update XP and streak
      const user = await User.findById(req.user._id);
      let xpEarned = 50;
      if (totalCO2 < 2.74) xpEarned += 30;
      if (totalCO2 < 2.0)  xpEarned += 20;
      user.xp += xpEarned;

      // Level up
      for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (user.xp >= LEVELS[i]) { user.level = i + 1; break; }
      }

      // Streak
      const today     = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (!user.lastLogDate) {
        user.streak = 1;
      } else {
        const last = new Date(user.lastLogDate).toDateString();
        if (last === yesterday)   user.streak += 1;
        else if (last !== today)  user.streak = 1;
      }
      user.lastLogDate = new Date();
      await user.save({ validateBeforeSave: false });

      logger.info(`Calculation saved: userId=${req.user._id} co2=${totalCO2}`);

      res.status(201).json({
        success: true,
        message: `Saved! +${xpEarned} XP`,
        calculation: calc,
        xpEarned,
        newXP:     user.xp,
        newLevel:  user.level,
        newStreak: user.streak,
      });
    } catch (error) {
      logger.error(`Save calc error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Failed to save calculation' });
    }
  }
);

// ── GET ALL (user's own only) ─────────────────
router.get('/', async (req, res) => {
  try {
    // Pagination to prevent massive data dumps
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    const [calculations, total] = await Promise.all([
      Calculation.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Calculation.countDocuments({ userId: req.user._id }),
    ]);

    res.status(200).json({
      success: true,
      count:   calculations.length,
      total,
      page,
      pages:   Math.ceil(total / limit),
      data:    calculations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch calculations' });
  }
});

// ── GET ONE ───────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const calc = await Calculation.findById(req.params.id).lean();
    if (!calc) return res.status(404).json({ success: false, message: 'Not found' });

    // Ownership check — users can only see their own data
    if (calc.userId.toString() !== req.user._id.toString()) {
      logger.warn(`Unauthorized data access attempt: userId=${req.user._id} calcId=${req.params.id}`);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: calc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE ONE ────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const calc = await Calculation.findById(req.params.id);
    if (!calc) return res.status(404).json({ success: false, message: 'Not found' });

    if (calc.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await calc.deleteOne();
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE ALL (user's own) ───────────────────
router.delete('/', async (req, res) => {
  try {
    const result = await Calculation.deleteMany({ userId: req.user._id });
    logger.info(`All calculations deleted: userId=${req.user._id} count=${result.deletedCount}`);
    res.status(200).json({ success: true, message: `Deleted ${result.deletedCount} entries` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
