// api.js — GreenWallet Frontend Connector v2.0
// PUT THIS FILE IN YOUR "Green Wallet 2.0" FOLDER
// Add to every HTML page: <script src="api.js"></script>
// ─────────────────────────────────────────────

const GW_API = 'https://greenwallet-backend-nm7j.onrender.com/api';

const getToken  = () => localStorage.getItem('gwToken');
const authHeaders = () => ({
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

// Core fetch wrapper — returns null if server offline
async function gwFetch(endpoint, options = {}) {
  try {
    const res  = await fetch(`${GW_API}${endpoint}`, options);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('GW API offline — using localStorage fallback');
    return null;
  }
}

// ════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════
const gwAuth = {

  async register(name, email, password) {
    const data = await gwFetch('/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password }),
    });
    if (data?.success) {
      localStorage.setItem('gwToken',          data.token);
      localStorage.setItem('gwUser',           JSON.stringify(data.user));
      localStorage.setItem('greenWalletUser',  data.user.name);
    }
    return data;
  },

  async login(email, password) {
    const data = await gwFetch('/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    if (data?.success) {
      localStorage.setItem('gwToken',          data.token);
      localStorage.setItem('gwUser',           JSON.stringify(data.user));
      localStorage.setItem('greenWalletUser',  data.user.name);
    }
    return data;
  },

  // Real logout — blacklists token on backend
  async logout() {
    try {
      await gwFetch('/auth/logout', {
        method:  'POST',
        headers: authHeaders(),
      });
    } catch (_) {}
    // Always clear local storage
    localStorage.removeItem('gwToken');
    localStorage.removeItem('gwUser');
    localStorage.removeItem('greenWalletUser');
    window.location.href = 'login.html';
  },

  async me() {
    return await gwFetch('/auth/me', { headers: authHeaders() });
  },

  async forgotPassword(email) {
    return await gwFetch('/auth/forgot-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
  },

  async resetPassword(token, password) {
    return await gwFetch(`/auth/reset-password/${token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    });
  },

  isLoggedIn() { return !!getToken(); },

  getUser() {
    const u = localStorage.getItem('gwUser');
    return u ? JSON.parse(u) : null;
  },
};

// ════════════════════════════════════════════
// CALCULATIONS
// ════════════════════════════════════════════
const gwCalc = {

  async save(calculationData) {
    const data = await gwFetch('/calculations', {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(calculationData),
    });

    // Always save to localStorage as backup
    const history = JSON.parse(localStorage.getItem('greenWalletHistory') || '[]');
    history.push({
      date:       calculationData.date || new Date().toLocaleDateString(),
      co2:        calculationData.totalCO2,
      trees:      calculationData.treesPerYear,
      categories: calculationData.categories || {},
    });
    localStorage.setItem('greenWalletHistory', JSON.stringify(history));

    return data;
  },

  async getAll() {
    const data = await gwFetch('/calculations', { headers: authHeaders() });
    if (data?.success) {
      // Sync to localStorage
      const history = data.data.map(c => ({
        date:       c.date,
        co2:        c.totalCO2,
        trees:      c.treesPerYear,
        categories: c.categories || {},
      }));
      localStorage.setItem('greenWalletHistory', JSON.stringify(history));
      return data.data;
    }
    return JSON.parse(localStorage.getItem('greenWalletHistory') || '[]');
  },

  async delete(id) {
    return await gwFetch(`/calculations/${id}`, {
      method:  'DELETE',
      headers: authHeaders(),
    });
  },

  async deleteAll() {
    const data = await gwFetch('/calculations', {
      method:  'DELETE',
      headers: authHeaders(),
    });
    localStorage.removeItem('greenWalletHistory');
    return data;
  },
};

// ════════════════════════════════════════════
// USER
// ════════════════════════════════════════════
const gwUser = {

  async getProfile() {
    const data = await gwFetch('/user/profile', { headers: authHeaders() });
    if (data?.success) {
      localStorage.setItem('gwProfile', JSON.stringify({
        name:     data.user.name,
        location: data.user.location,
        goal:     data.user.dailyGoal,
      }));
    }
    return data;
  },

  async updateProfile(updates) {
    const data = await gwFetch('/user/profile', {
      method:  'PUT',
      headers: authHeaders(),
      body:    JSON.stringify(updates),
    });
    if (data?.success) {
      localStorage.setItem('gwProfile', JSON.stringify({
        name:     data.user.name,
        location: data.user.location,
        goal:     data.user.dailyGoal,
      }));
    }
    return data;
  },

  async changePassword(currentPassword, newPassword) {
    return await gwFetch('/user/change-password', {
      method:  'PUT',
      headers: authHeaders(),
      body:    JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async deleteAccount(password) {
    return await gwFetch('/user/account', {
      method:  'DELETE',
      headers: authHeaders(),
      body:    JSON.stringify({ password }),
    });
  },
};

// ════════════════════════════════════════════
// STATS
// ════════════════════════════════════════════
const gwStats = {
  async getDashboard() {
    return await gwFetch('/stats/dashboard', { headers: authHeaders() });
  },
  async getLeaderboard() {
    return await gwFetch('/stats/leaderboard', { headers: authHeaders() });
  },
};

// ════════════════════════════════════════════
// AI TIPS
// ════════════════════════════════════════════
const gwAI = {
  async getTips(calculationData) {
    return await gwFetch('/ai/tips', {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(calculationData),
    });
  },
};

// ════════════════════════════════════════════
// NEWSLETTER
// ════════════════════════════════════════════
const gwNewsletter = {
  async subscribe(email, source = 'website') {
    return await gwFetch('/newsletter/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, source }),
    });
  },
};

// Export global GW object
window.GW = {
  auth:        gwAuth,
  calc:        gwCalc,
  user:        gwUser,
  stats:       gwStats,
  ai:          gwAI,
  newsletter:  gwNewsletter,
};

console.log('🌿 GreenWallet API connector v2.0 loaded');
