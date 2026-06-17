// navbar-auth.js — GreenWallet
// Add to EVERY page: <script src="api.js"></script><script src="navbar-auth.js"></script>

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
});

function updateNavbar() {
  const isLoggedIn  = typeof GW !== 'undefined' && GW.auth.isLoggedIn();
  const isLoginPage = window.location.pathname.includes('login.html');

  // If logged in and on login page → redirect immediately
  if (isLoggedIn && isLoginPage) {
    window.location.href = 'index.html';
    return;
  }

  const loginBtn = document.querySelector('.btn-login');

  if (isLoggedIn) {
    // ── LOGGED IN: replace Login button with avatar + name + logout ──
    if (!loginBtn) return;

    const user     = GW.auth.getUser();
    const name     = user?.name || localStorage.getItem('greenWalletUser') || 'User';
    const initials = name.trim().split(' ')
      .map(w => w[0]).join('').toUpperCase().slice(0, 2);

    loginBtn.outerHTML = `
      <div class="nav-user">
        <div class="nav-avatar" title="${name}">${initials}</div>
        <span class="nav-username">${name.split(' ')[0]}</span>
        <button class="nav-logout-btn" onclick="navLogout()" title="Logout">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
    `;

  } else {
    // ── NOT LOGGED IN ──
    if (loginBtn) {
      // Button exists — make sure it's correct
      loginBtn.textContent = 'Login';
      loginBtn.href        = 'login.html';
    } else {
      // Button was previously replaced by nav-user div (after logout)
      // Re-inject Login button into the nav menu
      const navUser = document.querySelector('.nav-user');
      if (navUser) {
        navUser.outerHTML = `<a href="login.html" class="btn-login">Login</a>`;
      } else {
        // Last resort — append to nav-menu
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
          const li = document.createElement('li');
          li.innerHTML = `<a href="login.html" class="btn-login">Login</a>`;
          navMenu.appendChild(li);
        }
      }
    }
  }
}

// Called when user clicks logout button
function navLogout() {
  // Clear all auth data
  localStorage.removeItem('gwToken');
  localStorage.removeItem('gwUser');
  localStorage.removeItem('greenWalletUser');
  localStorage.removeItem('gwLoggedIn');

  // Redirect to login page
  window.location.href = 'login.html';
}
