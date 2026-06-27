// login.js — GreenWallet (Sign Up first, Google OAuth ready)

document.addEventListener('DOMContentLoaded', () => {
  // Default state: Sign Up tab active
  // (already set in HTML — this just ensures JS matches)
  setupLoginForm();
  setupSignupForm();
  setupPasswordStrength();
  setupGoogleOAuth();
  setupHamburger();
});

// ── TAB SWITCHER ──────────────────────────────
function switchTab(tab) {
  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const tabLogin   = document.getElementById('tab-login');
  const tabSignup  = document.getElementById('tab-signup');
  const switchText = document.getElementById('switch-text');

  clearAlert();

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    switchText.innerHTML = 'New here? <a href="#" onclick="switchTab(\'signup\');return false;">Create a free account →</a>';
  } else {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    switchText.innerHTML = 'Already have an account? <a href="#" onclick="switchTab(\'login\');return false;">Sign in →</a>';
  }
}

// ── ALERTS ────────────────────────────────────
function showAlert(msg, type) {
  const box = document.getElementById('alert-box');
  box.innerHTML  = msg;
  box.className  = 'alert-box ' + type;
}

function clearAlert() {
  const box = document.getElementById('alert-box');
  box.className   = 'alert-box';
  box.textContent = '';
}

// ── FIELD HELPERS ─────────────────────────────
function setError(fieldId, errId, msg) {
  document.getElementById(fieldId)?.classList.add('invalid');
  const e = document.getElementById(errId);
  if (e) e.textContent = msg;
}

function clearField(fieldId, errId) {
  document.getElementById(fieldId)?.classList.remove('invalid');
  const e = document.getElementById(errId);
  if (e) e.textContent = '';
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function setBtnLoading(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

// ══════════════════════════════════════════════
// SIGNUP FORM (shown first)
// ══════════════════════════════════════════════
function setupSignupForm() {
  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const name  = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const pass  = document.getElementById('signup-password').value;
    let valid   = true;

    clearField('signup-name',     'err-signup-name');
    clearField('signup-email',    'err-signup-email');
    clearField('signup-password', 'err-signup-pass');

    if (!name || name.length < 2) {
      setError('signup-name',     'err-signup-name',  'Name must be at least 2 characters'); valid = false;
    }
    if (!email) {
      setError('signup-email',    'err-signup-email', 'Email is required'); valid = false;
    } else if (!isValidEmail(email)) {
      setError('signup-email',    'err-signup-email', 'Enter a valid email address'); valid = false;
    }
    if (!pass || pass.length < 6) {
      setError('signup-password', 'err-signup-pass',  'Password must be at least 6 characters'); valid = false;
    }
    if (!valid) return;

    setBtnLoading('signup-submit', true);

    try {
      const result = await GW.auth.register(name, email, pass);
      setBtnLoading('signup-submit', false);

      if (result === null) {
        showAlert(
          '⚠️ Cannot reach server. Make sure backend is running: ' +
          '<code style="background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;font-size:0.8rem">node server.js</code>',
          'error'
        );
        return;
      }

      if (result.success) {
        showAlert('🎉 Account created! Welcome, <strong>' + result.user.name + '</strong>! Redirecting...', 'success');
        setTimeout(() => { window.location.href = 'profile.html'; }, 1300);
      } else {
        showAlert('❌ ' + (result.message || 'Registration failed. Please try again.'), 'error');
        if (result.message?.toLowerCase().includes('email')) {
          setError('signup-email', 'err-signup-email', result.message);
        }
      }
    } catch (err) {
      setBtnLoading('signup-submit', false);
      showAlert('❌ Connection error. Is your backend running?', 'error');
    }
  });

  ['signup-name','signup-email','signup-password'].forEach((id, i) => {
    const errIds = ['err-signup-name','err-signup-email','err-signup-pass'];
    document.getElementById(id)?.addEventListener('input', () => clearField(id, errIds[i]));
  });
}

// ══════════════════════════════════════════════
// LOGIN FORM
// ══════════════════════════════════════════════
function setupLoginForm() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    let valid   = true;

    clearField('login-email',    'err-login-email');
    clearField('login-password', 'err-login-pass');

    if (!email) {
      setError('login-email', 'err-login-email', 'Email is required'); valid = false;
    } else if (!isValidEmail(email)) {
      setError('login-email', 'err-login-email', 'Enter a valid email address'); valid = false;
    }
    if (!pass) {
      setError('login-password', 'err-login-pass', 'Password is required'); valid = false;
    } else if (pass.length < 6) {
      setError('login-password', 'err-login-pass', 'Minimum 6 characters'); valid = false;
    }
    if (!valid) return;

    setBtnLoading('login-submit', true);

    try {
      const result = await GW.auth.login(email, pass);
      setBtnLoading('login-submit', false);

      if (result === null) {
        showAlert(
          '⚠️ Cannot reach server. Make sure backend is running: ' +
          '<code style="background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;font-size:0.8rem">node server.js</code>',
          'error'
        );
        return;
      }

      if (result.success) {
        showAlert('✅ Welcome back, <strong>' + result.user.name + '</strong>! Redirecting...', 'success');
        setTimeout(() => { window.location.href = 'profile.html'; }, 1200);
      } else {
        showAlert(
          '❌ ' + (result.message || 'Invalid email or password.') +
          '<br><small style="opacity:0.85">No account yet? <a href="#" onclick="switchTab(\'signup\');return false;" style="color:inherit;font-weight:700;text-decoration:underline">Sign up free →</a></small>',
          'error'
        );
      }
    } catch (err) {
      setBtnLoading('login-submit', false);
      showAlert('❌ Connection error. Is your backend running?', 'error');
    }
  });

  document.getElementById('login-email')?.addEventListener('input',
    () => clearField('login-email', 'err-login-email'));
  document.getElementById('login-password')?.addEventListener('input',
    () => clearField('login-password', 'err-login-pass'));
}

// ── PASSWORD STRENGTH ─────────────────────────
function setupPasswordStrength() {
  const input = document.getElementById('signup-password');
  if (!input) return;
  input.addEventListener('input', () => {
    const val   = input.value;
    const fill  = document.getElementById('strength-fill');
    const label = document.getElementById('strength-label');
    if (!fill || !label) return;
    if (!val) { fill.style.width = '0%'; label.textContent = ''; return; }

    let score = 0;
    if (val.length >= 6)           score++;
    if (val.length >= 10)          score++;
    if (/[A-Z]/.test(val))         score++;
    if (/[0-9]/.test(val))         score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;

    const cfgs = [
      { w:'20%', c:'#e05050', t:'Weak'      },
      { w:'40%', c:'#e8a020', t:'Fair'      },
      { w:'60%', c:'#e8a020', t:'Good'      },
      { w:'80%', c:'#2a9d8f', t:'Strong'    },
      { w:'100%',c:'#1a5f57', t:'Excellent' },
    ];
    const cfg = cfgs[Math.min(score, 4)];
    fill.style.width      = cfg.w;
    fill.style.background = cfg.c;
    label.textContent     = cfg.t;
    label.style.color     = cfg.c;
  });
}

// ── TOGGLE PASSWORD VISIBILITY ────────────────
function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon  = btn.querySelector('i');
  if (input.type === 'password') {
    input.type     = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type     = 'password';
    icon.className = 'fas fa-eye';
  }
}

// ══════════════════════════════════════════════
// GOOGLE OAUTH — Real implementation
// Uses Google Identity Services (GSI) library
// ══════════════════════════════════════════════

// 👉 Your real Google Client ID is plugged in below.
const GOOGLE_CLIENT_ID = '166151254632-c07ash3vl4euc8u7q21qq4vg68ath9tc.apps.googleusercontent.com';

let gwTokenClient = null;

function setupGoogleOAuth() {
  const btn = document.getElementById('google-btn');
  if (!btn) return;

  // Retry-poll: the GSI script can take a moment to finish loading even with
  // `defer`, so we check a few times before giving up instead of failing instantly.
  let attempts = 0;
  const maxAttempts = 20; // 20 x 150ms = 3 seconds total

  const tryInit = () => {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) {
      initGoogleButton(btn);
      return;
    }
    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(tryInit, 150);
    } else {
      // Genuinely not available after 3 seconds — wire up the fallback message
      btn.addEventListener('click', () => {
        showAlert(
          'ℹ️ Google Sign-In script did not load (check your internet connection). ' +
          'Use <strong>email & password</strong> for now — it works the same way!',
          'error'
        );
      });
    }
  };

  tryInit();
}

// Uses the OAuth popup flow (initTokenClient) instead of One Tap / prompt().
// This opens a real popup window and does NOT depend on FedCM, which is
// what was causing the 403 / NetworkError / NotAllowedError loop before.
function initGoogleButton(btn) {
  gwTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope:     'openid email profile',
    callback:  handleGoogleCallback,
    error_callback: (err) => {
      if (err.type === 'popup_failed_to_open') {
        showAlert(
          'ℹ️ Google popup was blocked. Please allow pop-ups for this site and try again, ' +
          'or use email & password instead.',
          'error'
        );
      } else if (err.type === 'popup_closed') {
        // User closed the popup themselves — no error needed
      } else {
        showAlert('❌ Google sign-in error: ' + (err.type || 'unknown error'), 'error');
      }
    },
  });

  btn.addEventListener('click', () => {
    gwTokenClient.requestAccessToken();
  });
}

// Called by Google after the user completes sign-in in the popup
async function handleGoogleCallback(response) {
  // response.access_token is an OAuth access token (not a JWT) —
  // send it to our backend, which will fetch the user's profile from Google
  try {
    const res = await fetch(`${GW_API}/auth/google`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ access_token: response.access_token }),
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('gwToken', data.token);
      localStorage.setItem('gwUser',  JSON.stringify(data.user));
      localStorage.setItem('greenWalletUser', data.user.name);
      showAlert('✅ Signed in with Google! Welcome, <strong>' + data.user.name + '</strong>!', 'success');
      setTimeout(() => { window.location.href = 'profile.html'; }, 1200);
    } else {
      showAlert('❌ Google sign-in failed: ' + data.message, 'error');
    }
  } catch (err) {
    showAlert('❌ Could not connect to server during Google sign-in.', 'error');
  }
}

// ── HAMBURGER ─────────────────────────────────
function setupHamburger() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('nav-menu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('open'));
}
