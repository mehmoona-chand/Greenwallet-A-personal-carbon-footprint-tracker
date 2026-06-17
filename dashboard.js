// GreenWallet Dashboard JS — Fixed benchmark + all features

const PAKISTAN_DAILY = 2.74;
const WORLD_DAILY    = 10.9;
const DAILY_GOAL     = 5.0;

const CATEGORY_COLORS = ['#2a9d8f','#3a8fc7','#e8a020','#e05050','#8b5cf6','#4ecdc4'];
const CATEGORY_NAMES  = ['Car','Public Transit','Meals','Electricity','Flights','Waste'];
const CATEGORY_ICONS  = ['🚗','🚌','🍽️','⚡','✈️','🗑️'];

let lineChart = null;
let pieChart  = null;
let allHistory = [];

window.addEventListener('DOMContentLoaded', () => {
  allHistory = JSON.parse(localStorage.getItem('greenWalletHistory') || '[]');
  renderAll(allHistory);
  animateStatCards();
  setupFilters();
  setupClearBtn();
  setupHamburger();
});

function animateStatCards() {
  document.querySelectorAll('.stat-card').forEach((card, i) => {
    setTimeout(() => card.classList.add('visible'), 100 + i * 90);
  });
}

function renderAll(history) {
  renderStats(history);
  renderLineChart(history);
  renderPieChart(history);
  renderBenchmark(history);
  renderForest(history);
  renderHistoryTable(history);
}

// ── STAT CARDS ──
function renderStats(history) {
  if (history.length === 0) {
    ['average-co2','total-trees','total-entries','vs-avg'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    updateGoalRing(0);
    return;
  }

  const co2Values = history.map(e => parseFloat(e.co2));
  const avg = co2Values.reduce((a,b) => a+b, 0) / co2Values.length;
  const totalTrees = history.reduce((a,e) => a + (parseFloat(e.trees) || 0), 0);

  countUp('average-co2', avg, 1800, '', 1);
  countUp('total-trees', totalTrees, 2200, '', 1);
  countUp('total-entries', history.length, 1200, '', 0);

  const diff = ((PAKISTAN_DAILY - avg) / PAKISTAN_DAILY * 100);
  const vsEl = document.getElementById('vs-avg');
  if (avg <= PAKISTAN_DAILY) {
    vsEl.textContent = '+' + Math.abs(diff).toFixed(0) + '%';
    vsEl.style.color = '#2a9d8f';
  } else {
    vsEl.textContent = '-' + Math.abs(diff).toFixed(0) + '%';
    vsEl.style.color = '#e05050';
  }

  const maxCo2 = Math.max(...co2Values, DAILY_GOAL);
  animateBar('bar-avg',     Math.min((avg / maxCo2) * 100, 100));
  animateBar('bar-trees',   Math.min((totalTrees / (history.length * 3)) * 100, 100));
  animateBar('bar-entries', Math.min((history.length / 10) * 100, 100));
  animateBar('bar-vs',      Math.min(Math.abs(diff), 100));

  updateGoalRing(Math.min((avg / DAILY_GOAL) * 100, 100));
}

function animateBar(id, pct) {
  setTimeout(() => { const el = document.getElementById(id); if (el) el.style.width = pct + '%'; }, 400);
}

function updateGoalRing(pct) {
  const fill  = document.getElementById('goal-ring-fill');
  if (!fill) return;
  fill.style.stroke = pct <= 80 ? '#4ecdc4' : pct <= 100 ? '#e8a020' : '#e05050';
  setTimeout(() => {
    fill.style.strokeDashoffset = 327 - (pct / 100) * 327;
    countUp('ring-pct', Math.round(pct), 1400, '%', 0);
  }, 300);
}

// ── LINE CHART ──
function renderLineChart(history) {
  const emptyEl = document.getElementById('empty-line');
  const canvas  = document.getElementById('co2-chart');
  if (history.length === 0) {
    emptyEl.style.display = 'flex'; canvas.style.display = 'none'; return;
  }
  emptyEl.style.display = 'none'; canvas.style.display = 'block';

  if (lineChart) lineChart.destroy();

  lineChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: history.map(e => e.date),
      datasets: [
        {
          label: 'Daily CO₂ (kg)',
          data: history.map(e => parseFloat(e.co2)),
          borderColor: '#2a9d8f',
          backgroundColor: 'rgba(42,157,143,0.08)',
          tension: 0.45, fill: true,
          pointBackgroundColor: '#2a9d8f',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5, pointHoverRadius: 7,
        },
        {
          label: 'Daily Goal',
          data: Array(history.length).fill(DAILY_GOAL),
          borderColor: 'rgba(232,160,32,0.5)',
          borderDash: [6,4], borderWidth: 1.5,
          pointRadius: 0, fill: false,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a5f57',
          titleColor: '#4ecdc4', bodyColor: '#fff',
          padding: 12, cornerRadius: 10,
          callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(2)} kg CO₂` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888', font: { size: 11 }, maxRotation: 30 } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(42,157,143,0.08)' },
          ticks: { color: '#888', font: { size: 11 }, callback: v => v + ' kg' }
        }
      }
    }
  });
}

// ── PIE/DONUT CHART ──
function renderPieChart(history) {
  const emptyEl  = document.getElementById('empty-pie');
  const canvas   = document.getElementById('pie-chart');
  const legendEl = document.getElementById('donut-legend');
  const donutMid = document.getElementById('donut-center');

  if (history.length === 0) {
    emptyEl.style.display = 'flex'; canvas.style.display = 'none';
    donutMid.style.display = 'none'; legendEl.innerHTML = ''; return;
  }

  const latest = [...history].reverse()[0];
  let categoryData = [0,0,0,0,0,0];

  if (latest.categories) {
    categoryData = [
      latest.categories.car || 0, latest.categories.public || 0,
      latest.categories.meals || 0, latest.categories.electricity || 0,
      latest.categories.flights || 0, latest.categories.waste || 0
    ];
  } else {
    const daily = parseFloat(latest.co2);
    categoryData = Array(6).fill(+(daily/6).toFixed(2));
  }

  const total = categoryData.reduce((a,b) => a+b, 0);
  emptyEl.style.display = 'none'; canvas.style.display = 'block';
  donutMid.style.display = 'flex';
  document.getElementById('donut-total').textContent = total.toFixed(1);

  if (pieChart) pieChart.destroy();

  pieChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: CATEGORY_NAMES,
      datasets: [{ data: categoryData, backgroundColor: CATEGORY_COLORS, borderColor: '#fff', borderWidth: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '70%',
      animation: { animateRotate: true, duration: 900 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a5f57', titleColor: '#4ecdc4', bodyColor: '#fff',
          padding: 10, cornerRadius: 8,
          callbacks: { label: ctx => ` ${ctx.parsed.toFixed(2)} kg (${((ctx.parsed/total)*100).toFixed(0)}%)` }
        }
      }
    }
  });

  legendEl.innerHTML = '';
  CATEGORY_NAMES.forEach((name, i) => {
    if (categoryData[i] <= 0) return;
    const pct = total > 0 ? ((categoryData[i]/total)*100).toFixed(0) : 0;
    const div = document.createElement('div');
    div.className = 'legend-item';
    div.innerHTML = `
      <span class="legend-dot" style="background:${CATEGORY_COLORS[i]}"></span>
      <span class="legend-name">${CATEGORY_ICONS[i]} ${name}</span>
      <span class="legend-val">${categoryData[i].toFixed(2)} kg</span>
      <span style="font-size:0.75rem;color:#888">${pct}%</span>
    `;
    legendEl.appendChild(div);
  });
}

// ── BENCHMARK — FIXED: shows correct verdict based on actual user data ──
function renderBenchmark(history) {
  const verdictEl = document.getElementById('bench-verdict');
  const youFill   = document.getElementById('bench-you');
  const youNum    = document.getElementById('bench-you-num');

  if (history.length === 0) {
    verdictEl.textContent = 'Log some entries to see how you compare!';
    verdictEl.style.background = '#f0f7f5';
    verdictEl.style.color = '#1a5f57';
    verdictEl.style.borderLeftColor = '#2a9d8f';
    return;
  }

  const co2Values = history.map(e => parseFloat(e.co2));
  const avg = co2Values.reduce((a,b) => a+b, 0) / co2Values.length;
  youNum.textContent = avg.toFixed(2) + ' kg';

  // Scale bars relative to world avg
  setTimeout(() => {
    youFill.style.width = Math.min((avg / WORLD_DAILY) * 100, 100) + '%';
  }, 800);

  // Dynamic verdict based on actual value
  let verdict, bgColor, textColor, borderColor;

  if (avg < 1.0) {
    verdict = '🌟 Exceptional! Your footprint is extremely low — you are a true sustainability champion!';
    bgColor = 'rgba(42,157,143,0.12)'; textColor = '#1a5f57'; borderColor = '#2a9d8f';
  } else if (avg < PAKISTAN_DAILY * 0.7) {
    verdict = `✅ Excellent! At ${avg.toFixed(1)} kg/day you are well below Pakistan's ${PAKISTAN_DAILY} kg average. Keep it up!`;
    bgColor = 'rgba(42,157,143,0.10)'; textColor = '#1a5f57'; borderColor = '#2a9d8f';
  } else if (avg < PAKISTAN_DAILY) {
    verdict = `👍 Good job! Your ${avg.toFixed(1)} kg/day is below Pakistan's national average of ${PAKISTAN_DAILY} kg. A bit more effort and you'll be a green star!`;
    bgColor = 'rgba(42,157,143,0.08)'; textColor = '#1a5f57'; borderColor = '#4ecdc4';
  } else if (avg < PAKISTAN_DAILY * 1.5) {
    verdict = `⚠️ Your ${avg.toFixed(1)} kg/day is slightly above Pakistan's ${PAKISTAN_DAILY} kg average. Small changes like cycling or reducing meat can help!`;
    bgColor = 'rgba(232,160,32,0.10)'; textColor = '#a06010'; borderColor = '#e8a020';
  } else if (avg < WORLD_DAILY) {
    verdict = `⚠️ At ${avg.toFixed(1)} kg/day you're above Pakistan's average. Try reducing car travel or electricity use to bring it down.`;
    bgColor = 'rgba(232,160,32,0.12)'; textColor = '#a06010'; borderColor = '#e8a020';
  } else {
    verdict = `🔴 Your ${avg.toFixed(1)} kg/day is high — above the world average of ${WORLD_DAILY} kg. Check the Calculator tips to find your biggest emission sources and reduce them!`;
    bgColor = 'rgba(224,80,80,0.08)'; textColor = '#c03030'; borderColor = '#e05050';
  }

  verdictEl.textContent = verdict;
  verdictEl.style.background = bgColor;
  verdictEl.style.color = textColor;
  verdictEl.style.borderLeftColor = borderColor;
}

// ── VIRTUAL FOREST ──
function renderForest(history) {
  const grid    = document.getElementById('forest-grid');
  const countEl = document.getElementById('forest-count');
  const MAX     = 30;
  const trees   = ['🌲','🌳','🌴','🌿','🎋'];

  grid.innerHTML = '';

  if (history.length === 0) {
    countEl.textContent = 'Log entries to grow your forest 🌱';
    for (let i = 0; i < MAX; i++) {
      const el = document.createElement('div');
      el.className = 'forest-stump'; el.textContent = '🪨';
      grid.appendChild(el);
    }
    return;
  }

  let earned = 0;
  history.forEach(e => {
    const co2 = parseFloat(e.co2);
    if (co2 < PAKISTAN_DAILY) earned += 3;
    else if (co2 < WORLD_DAILY) earned += 1;
  });
  earned = Math.min(earned, MAX);

  for (let i = 0; i < MAX; i++) {
    const el = document.createElement('div');
    if (i < earned) {
      el.className = 'forest-tree';
      el.textContent = trees[i % trees.length];
      el.style.animationDelay = (i * 0.05) + 's';
    } else {
      el.className = 'forest-stump'; el.textContent = '🪨';
    }
    grid.appendChild(el);
  }

  countEl.textContent = earned > 0
    ? `${earned} trees grown 🌲 · ${MAX - earned} more to unlock`
    : 'Keep logging low-emission days to grow trees! 🌱';
}

// ── HISTORY TABLE ──
function renderHistoryTable(history) {
  const tbody   = document.getElementById('history-body');
  const emptyEl = document.getElementById('empty-history');
  const tableEl = document.getElementById('history-table');
  tbody.innerHTML = '';

  if (history.length === 0) {
    tableEl.style.display = 'none'; emptyEl.style.display = 'flex'; return;
  }

  tableEl.style.display = 'table'; emptyEl.style.display = 'none';
  const icons = { car:'🚗', public:'🚌', meals:'🍽️', electricity:'⚡', flights:'✈️', waste:'🗑️' };

  [...history].reverse().forEach(entry => {
    const co2 = parseFloat(entry.co2);
    let topSource = '—';
    if (entry.categories) {
      const cats = entry.categories;
      const maxKey = Object.keys(cats).reduce((a,b) => cats[a] > cats[b] ? a : b);
      topSource = (icons[maxKey] || '') + ' ' + maxKey.charAt(0).toUpperCase() + maxKey.slice(1);
    }

    let statusHTML;
    if (co2 < PAKISTAN_DAILY) statusHTML = '<span class="status-badge good">✓ Below avg</span>';
    else if (co2 < WORLD_DAILY) statusHTML = '<span class="status-badge warn">~ Average</span>';
    else statusHTML = '<span class="status-badge bad">↑ High</span>';

    const trees = parseFloat(entry.trees) || 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td><span class="co2-badge">${co2.toFixed(2)} kg</span></td>
      <td>🌲 ${trees.toFixed(1)}/yr</td>
      <td>${topSource}</td>
      <td>${statusHTML}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── FILTER BUTTONS ──
function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = btn.dataset.range;
      if (range === 'all') { renderLineChart(allHistory); return; }
      const days = parseInt(range);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
      const filtered = allHistory.filter(e => new Date(e.date) >= cutoff);
      renderLineChart(filtered);
    });
  });
}

// ── CLEAR ──
function setupClearBtn() {
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('Clear all history? This cannot be undone.')) {
      localStorage.removeItem('greenWalletHistory');
      allHistory = [];
      renderAll([]);
    }
  });
}

// ── HAMBURGER ──
function setupHamburger() {
  const btn  = document.getElementById('hamburger');
  const menu = document.querySelector('.nav-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('open'));
}

// ── COUNT UP ──
function countUp(id, target, duration, suffix = '', decimals = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * eased).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
