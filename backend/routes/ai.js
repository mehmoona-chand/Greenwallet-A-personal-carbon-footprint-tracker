// routes/ai.js — Secure Claude AI proxy
// API key stays on server, never exposed to browser

const express     = require('express');
const https       = require('https');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const rateLimit   = require('express-rate-limit');
const logger      = require('../utils/logger');

const router = express.Router();
router.use(protect);

// AI-specific rate limiter — max 20 calls per hour per user
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      20,
  keyGenerator: (req) => req.user._id.toString(), // per-user, not per-IP
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'AI tip limit reached (20/hour). Please wait before requesting more tips.',
    });
  },
});

// ════════════════════════════════════════════
// POST /api/ai/tips
// ════════════════════════════════════════════
router.post('/tips',
  aiLimiter,
  [
    body('totalCO2').isFloat({ min:0, max:5000 }).withMessage('Invalid CO₂ value'),
    body('dietType').optional().isIn(['meat','mixed','vegetarian','vegan']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: errors.array()[0].msg });

    const { totalCO2, categories, dietType, inputs } = req.body;

    const dietLabels = { meat:'meat-heavy', mixed:'mixed', vegetarian:'vegetarian', vegan:'vegan' };
    const diet = dietLabels[dietType] || 'mixed';

    const catBreakdown = categories
      ? Object.entries(categories)
          .filter(([,v]) => (parseFloat(v)||0) > 0)
          .sort(([,a],[,b]) => b - a)
          .map(([k,v]) => `${k}: ${parseFloat(v).toFixed(2)} kg`)
          .join(', ')
      : 'not provided';

    const prompt = `You are an eco-advisor for GreenWallet, a carbon tracker for users in Pakistan.

User's daily carbon footprint:
- Total: ${parseFloat(totalCO2).toFixed(2)} kg CO₂/day
- Pakistan average: 2.74 kg/day, World average: 10.9 kg/day
- Breakdown by category: ${catBreakdown}
- Diet type: ${diet}
- Car travel: ${inputs?.carKm || 0} km/day
- Public transport: ${inputs?.publicKm || 0} km/day  
- Electricity: ${inputs?.electricityKwh || 0} kWh/day
- Flights: ${inputs?.flightsPerYear || 0} per year

Give a warm, personalized eco action plan specifically for this user's numbers.
Reference their actual data — not generic advice.

Format your response as HTML:
- A <ul> with 3-4 <li> items, each starting with an emoji and referencing their real numbers
- One encouraging <p> closing line

Keep it under 180 words. Be specific and friendly.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey.includes('YOUR_KEY')) {
      return res.status(200).json({
        success: true,
        tip:     getFallbackTip(totalCO2, categories),
        source:  'fallback',
      });
    }

    try {
      const bodyStr = JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages:   [{ role: 'user', content: prompt }],
      });

      const options = {
        hostname: 'api.anthropic.com',
        path:     '/v1/messages',
        method:   'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length':    Buffer.byteLength(bodyStr),
        },
        timeout: 15000,
      };

      const apiData = await new Promise((resolve, reject) => {
        const apiReq = https.request(options, (apiRes) => {
          let data = '';
          apiRes.on('data', chunk => { data += chunk; });
          apiRes.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(new Error('Invalid API response')); }
          });
        });
        apiReq.on('error',   reject);
        apiReq.on('timeout', () => reject(new Error('API timeout')));
        apiReq.write(bodyStr);
        apiReq.end();
      });

      const tip = apiData.content?.[0]?.text?.trim()
        ?.replace(/```html|```/g, '').trim();

      if (!tip) throw new Error('Empty AI response');

      logger.info(`AI tip generated: userId=${req.user._id}`);

      res.status(200).json({ success: true, tip, source: 'claude' });

    } catch (error) {
      logger.error(`AI tip error: ${error.message}`);
      res.status(200).json({
        success: true,
        tip:     getFallbackTip(totalCO2, categories),
        source:  'fallback',
      });
    }
  }
);

function getFallbackTip(totalCO2, categories) {
  const sorted = categories
    ? Object.entries(categories)
        .map(([k,v]) => [k, parseFloat(v)||0])
        .sort(([,a],[,b]) => b-a)
    : [];
  const top = sorted[0]?.[0] || 'car';

  const tips = {
    car:             '<ul><li>🚗 Car travel is your top emission source. Try carpooling or public transport 2-3 days per week to save significant CO₂.</li><li>🚌 Public transport emits up to 80% less CO₂ per km than a solo car.</li><li>🌿 Even one car-free day weekly adds up to big savings over a year.</li></ul><p>You are already tracking — that is the first step to real change! 💚</p>',
    publicTransport: '<ul><li>🚌 Great — public transport is already low-carbon. Keep it up!</li><li>🥗 Consider your diet next — food is often a bigger source than transport.</li><li>⚡ Check your electricity use and unplug devices on standby.</li></ul><p>Your transport choices are already eco-friendly — keep building on this! 💚</p>',
    meals:           '<ul><li>🥩 Food is your top source. Try one plant-based meal per day to cut food emissions by up to 30%.</li><li>🌾 Dal, lentils, and vegetables have a fraction of the footprint of meat.</li><li>🛒 Buying locally grown produce also reduces transport emissions.</li></ul><p>Small diet changes compound into big yearly impact — you are on the right track! 💚</p>',
    electricity:     '<ul><li>⚡ Electricity is your biggest source. Unplug all devices on standby tonight.</li><li>💡 Switching to LED bulbs cuts lighting energy use by 75%.</li><li>❄️ Setting your AC to 26°C instead of 18°C saves 30% electricity.</li></ul><p>Energy habits are the fastest way to see your score drop — start tonight! 💚</p>',
    flights:         '<ul><li>✈️ Flights have a large impact. One long-haul flight equals months of car driving.</li><li>🚂 For trips under 600km, trains emit 80% less CO₂ than flying.</li><li>🌿 Offset unavoidable flights through a verified carbon program.</li></ul><p>Being flight-aware already puts you ahead of most travellers! 💚</p>',
    waste:           '<ul><li>🗑️ Waste is your top source. Start composting food scraps instead of binning them.</li><li>♻️ Separating recyclables keeps materials out of high-emission landfills.</li><li>🛍️ Carry a reusable bag — every plastic bag takes 400 years to decompose.</li></ul><p>Small waste habits add up to big yearly savings for you and the planet! 💚</p>',
  };

  return tips[top] || tips['car'];
}

module.exports = router;
