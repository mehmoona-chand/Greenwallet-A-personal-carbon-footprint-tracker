// GreenWallet Features JS — animates all demo widgets

document.addEventListener('DOMContentLoaded', () => {
  setupHamburger();
  animateOnScroll();
  buildTrendDemo();
  buildForestDemo();
  startAITyping();
});

function setupHamburger() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('nav-menu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('open'));
}

// ── Intersection Observer — animate demos when visible ──
function animateOnScroll() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const card = entry.target;

      // Calc demo bars
      card.querySelectorAll('.demo-fill').forEach(el => {
        setTimeout(() => { el.style.width = el.dataset.w + '%'; }, 100);
      });

      // Benchmark bars
      card.querySelectorAll('.bench-fill').forEach(el => {
        setTimeout(() => { el.style.width = el.dataset.w + '%'; }, 200);
      });

      // XP bar
      const xpFill = card.querySelector('.demo-xp-fill');
      if (xpFill) setTimeout(() => { xpFill.style.width = xpFill.dataset.w + '%'; }, 300);

      // Trend bars
      card.querySelectorAll('.trend-bar').forEach((bar, i) => {
        setTimeout(() => { bar.style.height = bar.dataset.h + '%'; }, 100 + i * 60);
      });

      // AI messages
      card.querySelectorAll('.ai-msg').forEach(msg => {
        const delay = parseInt(msg.dataset.delay) || 0;
        setTimeout(() => msg.classList.add('visible'), delay + 200);
      });

      // Forest
      card.querySelectorAll('.f-tree').forEach((t, i) => {
        t.style.animationDelay = (i * 0.04) + 's';
      });

      observer.unobserve(card);
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.demo-card').forEach(card => observer.observe(card));
}

// ── Trend chart (mini bar chart) ──
function buildTrendDemo() {
  const container = document.getElementById('mini-trend');
  if (!container) return;

  const data = [6.2, 5.8, 7.1, 4.9, 5.2, 3.8, 4.5];
  const goal = 5.0;
  const max  = Math.max(...data);

  data.forEach(val => {
    const pct   = (val / max) * 100;
    const color = val <= goal ? 'linear-gradient(to top,#2a9d8f,#4ecdc4)' : 'linear-gradient(to top,#e8a020,#f5c842)';
    const bar   = document.createElement('div');
    bar.className  = 'trend-bar';
    bar.style.cssText = `height:0%;background:${color};`;
    bar.dataset.h  = pct;
    container.appendChild(bar);
  });
}

// ── Forest demo ──
function buildForestDemo() {
  const grid = document.getElementById('demo-forest');
  if (!grid) return;
  const trees = ['🌲','🌳','🌴','🌿','🎋'];
  const total = 27;
  const grown = 18;
  for (let i = 0; i < total; i++) {
    const el = document.createElement('div');
    if (i < grown) {
      el.className = 'f-tree';
      el.textContent = trees[i % trees.length];
      el.style.animationDelay = (i * 0.04) + 's';
    } else {
      el.className = 'f-rock';
      el.textContent = '🪨';
    }
    grid.appendChild(el);
  }
}

// ── AI typing animation (loops) ──
function startAITyping() {
  const msgs = document.querySelectorAll('.ai-msg');
  if (!msgs.length) return;

  function showMessages() {
    msgs.forEach(m => m.classList.remove('visible'));
    msgs.forEach(m => {
      const delay = parseInt(m.dataset.delay) || 0;
      setTimeout(() => m.classList.add('visible'), delay + 300);
    });
    // Loop every 6s
    setTimeout(showMessages, 6000);
  }

  // Start after 1s
  setTimeout(showMessages, 1000);
}
