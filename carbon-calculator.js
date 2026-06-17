// carbon-calculator.js — GreenWallet
// NOW CONNECTED TO BACKEND via api.js
// ─────────────────────────────────────────────
// IMPORTANT: api.js must be in the same folder
// and loaded in carbon-calculator.html:
//   <script src="api.js"></script>
//   <script src="carbon-calculator.js"></script>
// ─────────────────────────────────────────────

const FACTORS = {
  car:         0.12,
  public:      0.05,
  meals:       2.5,
  electricity: 0.4,
  flights:     90,
  waste:       0.07
};

const TREE_CO2_PER_YEAR = 22;
const PAKISTAN_DAILY    = 2.74;
const WORLD_DAILY       = 10.9;

let lastCalculation = null;

// ── Setup ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupLivePreview();
  setupForm();
  setupHamburger();
});

function setupHamburger() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('nav-menu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('open'));
}

// ── LIVE PREVIEW ──────────────────────────────
function setupLivePreview() {
  ['car','public','meals','electricity','flights','waste'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateLivePreview);
  });
  document.querySelectorAll('input[name="diet"]').forEach(r =>
    r.addEventListener('change', updateLivePreview)
  );
}

function getDietFactor() {
  const checked = document.querySelector('input[name="diet"]:checked');
  return checked ? parseFloat(checked.value) : 1.0;
}

function getInputValues() {
  return {
    car:         Math.max(0, parseFloat(document.getElementById('car').value)         || 0),
    public:      Math.max(0, parseFloat(document.getElementById('public').value)      || 0),
    meals:       Math.max(0, parseFloat(document.getElementById('meals').value)       || 0),
    electricity: Math.max(0, parseFloat(document.getElementById('electricity').value) || 0),
    flights:     Math.max(0, parseFloat(document.getElementById('flights').value)     || 0),
    waste:       Math.max(0, parseFloat(document.getElementById('waste').value)       || 0),
  };
}

function calcCategories(inputs, dietFactor) {
  return {
    car:             inputs.car         * FACTORS.car,
    publicTransport: inputs.public      * FACTORS.public,
    meals:           inputs.meals       * FACTORS.meals * dietFactor,
    electricity:     inputs.electricity * FACTORS.electricity,
    flights:         (inputs.flights    * FACTORS.flights) / 365,
    waste:           (inputs.waste      * 0.07) / 7,
  };
}

function updateLivePreview() {
  const inputs     = getInputValues();
  const dietFactor = getDietFactor();
  const cats       = calcCategories(inputs, dietFactor);
  const total      = Object.values(cats).reduce((a,b) => a+b, 0);
  const maxVal     = Math.max(...Object.values(cats), 0.01);

  document.getElementById('preview-total').textContent = total.toFixed(2) + ' kg CO₂/day';
  document.querySelector('.preview-hint').style.display = total > 0 ? 'none' : '';

  ['car','public','meals','electricity','flights','waste'].forEach(cat => {
    const key  = cat === 'public' ? 'publicTransport' : cat;
    const row  = document.querySelector(`.preview-bar-row[data-cat="${cat}"]`);
    if (!row) return;
    const fill  = row.querySelector('.bar-fill');
    const valEl = row.querySelector('.bar-val');
    const pct   = total > 0 ? (cats[key] / maxVal) * 100 : 0;
    fill.style.width    = pct + '%';
    valEl.textContent   = (cats[key] || 0).toFixed(2);
  });
}

// ── FORM & VALIDATION ──────────────────────────
function setupForm() {
  document.getElementById('carbon-form').addEventListener('submit', e => {
    e.preventDefault();
    if (validateForm()) runCalculation();
  });

  document.getElementById('save-btn').addEventListener('click', saveEntry);
}

function validateForm() {
  const limits = { car:2000, public:2000, meals:20, electricity:500, flights:365, waste:200 };
  let valid = true;

  Object.entries(limits).forEach(([id, max]) => {
    const el  = document.getElementById(id);
    const err = document.getElementById('err-' + id);
    const val = parseFloat(el.value);

    el.classList.remove('error');
    if (err) err.textContent = '';

    if (el.value !== '' && (isNaN(val) || val < 0)) {
      el.classList.add('error');
      if (err) err.textContent = 'Please enter a valid positive number';
      valid = false;
    } else if (!isNaN(val) && val > max) {
      el.classList.add('error');
      if (err) err.textContent = `Maximum is ${max}`;
      valid = false;
    }
  });

  return valid;
}

// ── MAIN CALCULATION ───────────────────────────
function runCalculation() {
  const inputs     = getInputValues();
  const dietFactor = getDietFactor();
  const cats       = calcCategories(inputs, dietFactor);
  const total      = Object.values(cats).reduce((a,b) => a+b, 0);
  const yearlyCO2  = total * 365;
  const trees      = yearlyCO2 / TREE_CO2_PER_YEAR;

  lastCalculation = { inputs, dietFactor, cats, total, trees };

  const resultEl = document.getElementById('result');
  resultEl.classList.remove('hidden');
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

  animateCountUp('total-co2-display', total, 1000, 2);
  document.getElementById('trees').textContent = trees.toFixed(1);

  setScoreGrade(total);
  renderStaticTips(cats, dietFactor);
  fetchAITips(inputs, cats, total, dietFactor);
}

function setScoreGrade(total) {
  const gradeEl   = document.getElementById('score-grade');
  const compareEl = document.getElementById('score-compare');
  const circle    = document.getElementById('score-circle');

  let grade, color, compare;

  if (total < 1.0) {
    grade = '🌟 Exceptional'; color = '#2a9d8f';
    compare = `Only ${total.toFixed(2)} kg/day — far below Pakistan's average!`;
  } else if (total < PAKISTAN_DAILY) {
    grade = '✅ Great'; color = '#2a9d8f';
    compare = `${total.toFixed(2)} kg/day is below Pakistan's national average of ${PAKISTAN_DAILY} kg.`;
  } else if (total < PAKISTAN_DAILY * 1.5) {
    grade = '⚠️ Moderate'; color = '#e8a020';
    compare = `${total.toFixed(2)} kg/day is slightly above Pakistan's ${PAKISTAN_DAILY} kg average.`;
  } else if (total < WORLD_DAILY) {
    grade = '⚠️ High'; color = '#e8a020';
    compare = `${total.toFixed(2)} kg/day — above Pakistan's average but below the world's ${WORLD_DAILY} kg.`;
  } else {
    grade = '🔴 Very High'; color = '#e05050';
    compare = `${total.toFixed(2)} kg/day is above the world average of ${WORLD_DAILY} kg!`;
  }

  gradeEl.textContent   = grade;
  gradeEl.style.color   = color;
  compareEl.textContent = compare;
  circle.style.background = `linear-gradient(135deg, ${color}, #1a5f57)`;
}

function renderStaticTips(cats, dietFactor) {
  const tipEl = document.getElementById('tip-text');
  tipEl.innerHTML = '';

  const sorted = Object.entries(cats)
    .filter(([,v]) => v > 0)
    .sort(([,a],[,b]) => b - a);

  const tipMap = {
    car:             '🚗 Car is your top emission — try carpooling, cycling, or public transport.',
    publicTransport: '🚌 Great choice using public transport! Already low-carbon.',
    meals:           dietFactor > 0.6
                       ? '🥩 Switching one meal/day to plant-based can reduce food emissions by 30–50%.'
                       : '🌱 Great diet choice! Plant-based meals have a much lower footprint.',
    electricity:     '⚡ Turn off devices on standby, switch to LEDs, consider solar panels.',
    flights:         '✈️ One long-haul flight equals months of car driving.',
    waste:           '🗑️ Composting food waste and recycling reduces waste emissions significantly.',
  };

  sorted.slice(0, 3).forEach(([cat]) => {
    const li = document.createElement('li');
    li.textContent = tipMap[cat] || '';
    tipEl.appendChild(li);
  });
}

// ── CLAUDE AI TIPS ─────────────────────────────
async function fetchAITips(inputs, cats, total, dietFactor) {
  const loadingEl  = document.getElementById('ai-loading');
  const responseEl = document.getElementById('ai-response');

  loadingEl.style.display  = 'flex';
  responseEl.style.display = 'none';
  responseEl.classList.remove('visible');

  try {
    let tipHtml = '';

    // Try backend AI route first (API key is safe on server)
    if (typeof GW !== 'undefined' && GW.auth.isLoggedIn()) {
      const dietLabels = { '1.0':'meat', '0.7':'mixed', '0.4':'vegetarian', '0.25':'vegan' };
      const result = await GW.ai.getTips({
        totalCO2:   total,
        categories: cats,
        dietType:   dietLabels[String(dietFactor)] || 'mixed',
        inputs: {
          carKm:          inputs.car,
          publicKm:       inputs.public,
          mealsCount:     inputs.meals,
          electricityKwh: inputs.electricity,
          flightsPerYear: inputs.flights,
          wasteKgPerWeek: inputs.waste,
        },
      });

      if (result?.success) {
        tipHtml = result.tip;
      }
    }

    // Fallback: call Anthropic directly from frontend if not logged in
    if (!tipHtml) {
      const dietLabels2 = { '1.0':'meat-heavy','0.7':'mixed','0.4':'vegetarian','0.25':'vegan' };
      const sortedCats = Object.entries(cats)
        .filter(([,v]) => v > 0)
        .sort(([,a],[,b]) => b - a)
        .map(([k,v]) => `${k}: ${v.toFixed(2)} kg`)
        .join(', ');

      const prompt = `You are an eco-advisor for GreenWallet in Pakistan.
User's footprint: ${total.toFixed(2)} kg CO₂/day (Pakistan avg: 2.74 kg). Breakdown: ${sortedCats}. Diet: ${dietLabels2[String(dietFactor)]}.
Give a personalized HTML eco plan: <ul> with 3-4 <li> tips mentioning real numbers, then a <p> encouragement. Under 180 words.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await response.json();
      tipHtml = data.content?.[0]?.text?.trim() || '';
    }

    loadingEl.style.display = 'none';

    if (tipHtml) {
      tipHtml = tipHtml.replace(/```html|```/g, '').trim();
      responseEl.innerHTML  = tipHtml;
      responseEl.style.display = 'block';
      responseEl.classList.add('visible');
    } else {
      showAIFallback(responseEl, cats, dietFactor);
    }

  } catch (err) {
    loadingEl.style.display = 'none';
    showAIFallback(responseEl, cats, dietFactor);
  }
}

function showAIFallback(el, cats, dietFactor) {
  const sorted = Object.entries(cats).sort(([,a],[,b]) => b - a);
  const top    = sorted[0]?.[0] || 'car';
  const tips   = {
    car:             '💡 Car travel is your biggest source. Even one car-free day a week saves 12+ kg/month.',
    publicTransport: '💡 You rely on public transport — great! Keep it up and encourage others.',
    meals:           dietFactor > 0.5 ? '💡 Try swapping one meat meal per day with a vegetarian option.' : '💡 Your plant-based diet is already making a big difference!',
    electricity:     '💡 Electricity is your top source. Try shorter appliance use and unplug at night.',
    flights:         '💡 Flights have a large impact. For local travel, trains emit 80% less CO₂.',
    waste:           '💡 Start composting food scraps — it can cut waste emissions significantly.',
  };
  el.innerHTML = `<div class="ai-error">${tips[top] || tips['car']}</div>`;
  el.style.display = 'block';
  el.classList.add('visible');
}

// ══════════════════════════════════════════════
// SAVE TO BACKEND (MongoDB) + localStorage backup
// ══════════════════════════════════════════════
async function saveEntry() {
  if (!lastCalculation) return;

  const { cats, total, trees, inputs, dietFactor } = lastCalculation;
  const dietLabels = { '1.0':'meat', '0.7':'mixed', '0.4':'vegetarian', '0.25':'vegan' };

  const calculationData = {
    totalCO2:    parseFloat(total.toFixed(2)),
    treesPerYear:parseFloat(trees.toFixed(2)),
    categories:  cats,
    inputs: {
      carKm:          inputs.car,
      publicKm:       inputs.public,
      mealsCount:     inputs.meals,
      dietType:       dietLabels[String(dietFactor)] || 'mixed',
      electricityKwh: inputs.electricity,
      flightsPerYear: inputs.flights,
      wasteKgPerWeek: inputs.waste,
    },
    date: new Date().toLocaleDateString(),
  };

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    // ✅ Save to MongoDB via backend (also saves to localStorage inside api.js)
    if (typeof GW !== 'undefined' && GW.auth.isLoggedIn()) {
      const result = await GW.calc.save(calculationData);

      if (result?.success) {
        btn.innerHTML = '<i class="fas fa-check"></i> Saved to Cloud! Redirecting...';
        btn.style.background = 'linear-gradient(135deg, #2a9d8f, #4ecdc4)';
        console.log(`✅ Saved to MongoDB! +${result.xpEarned} XP earned`);
      } else {
        // Backend rejected — still saved to localStorage by api.js
        btn.innerHTML = '<i class="fas fa-check"></i> Saved Locally! Redirecting...';
        btn.style.background = 'linear-gradient(135deg, #e8a020, #e8a020)';
      }
    } else {
      // Not logged in — save only to localStorage
      const history = JSON.parse(localStorage.getItem('greenWalletHistory') || '[]');
      history.push({
        date:       calculationData.date,
        co2:        total.toFixed(1) + ' kg',
        trees:      trees.toFixed(1),
        categories: cats,
      });
      localStorage.setItem('greenWalletHistory', JSON.stringify(history));
      btn.innerHTML = '<i class="fas fa-check"></i> Saved Locally! (Login to sync to cloud)';
      btn.style.background = 'linear-gradient(135deg, #e8a020, #e8a020)';
    }

  } catch (err) {
    // Network error — save to localStorage as fallback
    const history = JSON.parse(localStorage.getItem('greenWalletHistory') || '[]');
    history.push({
      date:       calculationData.date,
      co2:        total.toFixed(1) + ' kg',
      trees:      trees.toFixed(1),
      categories: cats,
    });
    localStorage.setItem('greenWalletHistory', JSON.stringify(history));
    btn.innerHTML = '<i class="fas fa-check"></i> Saved Locally! Redirecting...';
    console.warn('Backend unavailable — saved to localStorage:', err.message);
  }

  setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
}

// ── ANIMATED COUNT UP ──────────────────────────
function animateCountUp(id, target, duration, decimals = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
