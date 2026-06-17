// GreenWallet About Page JS

const PAKISTAN_DAILY = 2.74;

document.addEventListener('DOMContentLoaded', () => {
  setupReveal();
  loadLiveStats();
  setupHamburger();
});

// ── SCROLL REVEAL ─────────────────────────────
function setupReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger cards in the same parent
        const siblings = entry.target.parentElement.querySelectorAll('.reveal');
        siblings.forEach((el, idx) => {
          setTimeout(() => el.classList.add('visible'), idx * 100);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── LIVE STATS from localStorage ─────────────
function loadLiveStats() {
  const history = JSON.parse(localStorage.getItem('greenWalletHistory') || '[]');

  // Total calculations
  const calcs = history.length;
  animateNum('stat-calcs', calcs, 1200, 0);

  if (calcs === 0) {
    document.getElementById('stat-trees').textContent = '0';
    document.getElementById('stat-co2').textContent   = '0 kg';
    document.getElementById('stat-vs').textContent    = 'No data yet';
    document.getElementById('stat-vs').style.fontSize = '1rem';
    return;
  }

  // Total trees
  const totalTrees = history.reduce((a, e) => a + (parseFloat(e.trees) || 0), 0);
  animateNum('stat-trees', totalTrees, 1500, 1);

  // Total CO2
  const totalCO2 = history.reduce((a, e) => a + parseFloat(e.co2), 0);
  const co2El = document.getElementById('stat-co2');
  setTimeout(() => {
    let start = 0;
    const end = totalCO2;
    const dur = 1600;
    const startTime = performance.now();
    function frame(now) {
      const p = Math.min((now - startTime) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      co2El.textContent = (end * eased).toFixed(1) + ' kg';
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }, 400);

  // vs Pakistan avg
  const co2Values = history.map(e => parseFloat(e.co2));
  const avg = co2Values.reduce((a, b) => a + b, 0) / co2Values.length;
  const vsEl = document.getElementById('stat-vs');
  const diff = ((PAKISTAN_DAILY - avg) / PAKISTAN_DAILY * 100);

  if (avg <= PAKISTAN_DAILY) {
    vsEl.textContent = '+' + Math.abs(diff).toFixed(0) + '%';
    vsEl.style.color = '#2a9d8f';
    vsEl.nextElementSibling && (vsEl.nextElementSibling.textContent = 'below national avg');
  } else {
    vsEl.textContent = '-' + Math.abs(diff).toFixed(0) + '%';
    vsEl.style.color = '#e05050';
  }
}

function animateNum(id, target, duration, decimals) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (p < 1) requestAnimationFrame(frame);
  }
  setTimeout(() => requestAnimationFrame(frame), 300);
}

// ── FAQ ACCORDION ─────────────────────────────
function toggleFaq(btn) {
  const item   = btn.parentElement;
  const answer = item.querySelector('.faq-a');
  const isOpen = btn.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-q.open').forEach(q => {
    q.classList.remove('open');
    q.parentElement.querySelector('.faq-a').classList.remove('open');
  });

  // Open clicked (if was closed)
  if (!isOpen) {
    btn.classList.add('open');
    answer.classList.add('open');
  }
}

// ── HAMBURGER ─────────────────────────────────
function setupHamburger() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('nav-menu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('open'));
}
