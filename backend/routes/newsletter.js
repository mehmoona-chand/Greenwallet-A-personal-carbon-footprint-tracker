const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const Subscriber = require('../models/Subscriber');
const logger = require('../utils/logger');

const router = express.Router();

const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many subscribe attempts. Please try again later.',
    });
  },
});

router.post('/subscribe', subscribeLimiter, [
  body('email')
    .normalizeEmail()
    .isEmail()
    .withMessage('Enter a valid email')
    .isLength({ max: 100 })
    .withMessage('Email too long'),
  body('source')
    .optional()
    .trim()
    .isIn(['website', 'index', 'profile'])
    .withMessage('Invalid source'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const email  = req.body.email;
  const source = req.body.source || 'website';

  try {
    const existing = await Subscriber.findOne({ email });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "You're already subscribed!",
      });
    }

    await Subscriber.create({ email, source });
    logger.info(`Newsletter subscribe: ${email} source=${source} IP:${req.ip}`);

    res.status(201).json({
      success: true,
      message: 'Thanks for subscribing!',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: "You're already subscribed!",
      });
    }
    logger.error(`Newsletter subscribe error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Could not subscribe right now. Please try again.',
    });
  }
});

module.exports = router;
