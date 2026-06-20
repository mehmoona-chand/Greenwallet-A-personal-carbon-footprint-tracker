<div align="center">

<img src="screenshots/home.png" alt="GreenWallet Banner" width="100%"/>

# 🌿 GreenWallet

### Your Personal Carbon Footprint & Eco Finance Tracker

*Track your environmental impact. Make greener choices. Live sustainably.*

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Status](https://img.shields.io/badge/Status-Full_Stack_Live-2a9d8f?style=for-the-badge)
![License](https://img.shields.io/badge/License-Educational-green?style=for-the-badge)

[🌐 Frontend (Live)](https://greenwallet-frontend-l4h2.onrender.com) · [🔧 Backend API (Live)](https://greenwallet-backend-nm7j.onrender.com) · [⚡ Quick Start](#-quick-start) · [📸 Screenshots](#-screenshots) · [🤝 Contribute](#-contributing)

</div>

---

## 📌 About

**GreenWallet** is a full-stack web application that helps users track their carbon footprint, monitor eco-friendly habits, and make more sustainable lifestyle choices every day. The platform combines personal analytics with environmental impact awareness to inspire greener decisions.

> 🌱 Frontend (HTML/CSS/JS) and backend (Node.js + Express + MongoDB) are both built and deployed live on Render.

---

## 🔗 Live Application

| Service | URL |
|---------|-----|
| 🌐 Frontend | [greenwallet-frontend-l4h2.onrender.com](https://greenwallet-frontend-l4h2.onrender.com) |
| 🔧 Backend API | [greenwallet-backend-nm7j.onrender.com](https://greenwallet-backend-nm7j.onrender.com) |

> ⚠️ Note: Render free-tier services spin down when idle, so the first request after inactivity may take ~30–60 seconds to wake up.

---

## ✨ Features

### 🏠 Home Page
- Hero section with platform introduction and live CO₂ stats
- "How It Works" section with step-by-step guide
- Sustainable Living Blog with eco tips
- Impact statistics — Trees Saved, Carbon Reduction Goal, Daily Users

### 🔐 Authentication
- Sign Up / Sign In with JWT-based auth (now live against the backend)
- Google Sign-In integration (UI ready)
- Form validation and error handling

### 📊 Dashboard
- Personal carbon footprint overview
- Daily streak and XP tracking
- Eco spending and activity summary
- Interactive charts and progress indicators

### 🧮 Carbon Calculator
- Calculate emissions from transport, food, and energy
- Visual results with reduction suggestions
- Instant CO₂ impact feedback
- Calculations persisted via the backend API

### 👤 Profile Page
- User profile with eco level and XP progress
- Achievement badges system
- Daily goal tracker with progress ring
- Carbon entry history

### 🌟 Features & About Pages
- Platform mission and vision
- Detailed feature showcase
- Team and project information

### 🛡️ Backend / API
- RESTful API built with Express
- MongoDB + Mongoose data layer
- JWT authentication with `bcryptjs` password hashing
- Security hardening: `helmet`, `express-rate-limit`, `express-slow-down`, `express-mongo-sanitize`, `xss-clean`, `hpp`
- Email notifications via `nodemailer`
- Request logging via `morgan` + `winston`
- CORS configured for the deployed frontend origin

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (Custom + Responsive) |
| Frontend Logic | Vanilla JavaScript (ES6+) |
| Backend Runtime | Node.js (≥18) |
| Backend Framework | Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcryptjs |
| Security | Helmet, rate limiting, sanitization, XSS protection |
| Hosting | Render (frontend + backend, separate services) |
| Icons | SVG / Custom Assets |
| Fonts | Google Fonts |

---

## 📁 Project Structure

```
Greenwallet-A-personal-carbon-footprint-tracker/
│
├── index.html                  # Landing / Home page
├── login.html                  # Sign Up & Sign In
├── dashboard.html              # User dashboard
├── carbon-calculator.html      # Carbon footprint calculator
├── features.html               # Features showcase
├── about.html                  # About page
├── profile.html                # User profile
│
├── styles.css                  # Global styles
├── dashboard.css               # Dashboard styles
├── login.css                   # Auth styles
├── features.css                # Features styles
├── about.css                   # About styles
├── profile.css                 # Profile styles
├── carbon-calculator.css       # Calculator styles
├── navbar-auth-styles.css      # Navbar styles
│
├── script.js                   # Global scripts
├── dashboard.js                # Dashboard logic
├── login.js                    # Auth logic
├── features.js                 # Features logic
├── about.js                    # About logic
├── profile.js                  # Profile logic
├── carbon-calculator.js        # Calculator logic
├── navbar-auth.js              # Dynamic auth navbar
├── api.js                      # Frontend → backend API integration layer
│
├── screenshots/                # Project screenshots
├── images/                     # Assets and images
│
└── backend/                    # Node.js + Express + MongoDB API
    ├── server.js                # App entry point
    ├── api.js                   # API router setup
    ├── package.json
    ├── package-lock.json
    │
    ├── config/
    │   └── db.js                # MongoDB connection
    │
    ├── middleware/
    │   ├── auth.js              # JWT auth middleware
    │   └── security.js          # Helmet, rate limiting, sanitization
    │
    ├── models/
    │   ├── User.js               # User schema
    │   └── Calculation.js        # Carbon calculation schema
    │
    ├── routes/
    │   ├── auth.js               # Sign up / sign in / JWT
    │   ├── user.js                # User profile endpoints
    │   ├── calculations.js        # Carbon calculator endpoints
    │   ├── stats.js               # Dashboard/stats endpoints
    │   └── ai.js                  # AI-related endpoints
    │
    └── utils/
        ├── email.js              # Nodemailer email helper
        └── logger.js             # Winston logger
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js ≥ 18 and npm (for the backend)
- Any modern web browser (Chrome, Firefox, Edge)
- VS Code with Live Server extension (recommended for frontend)
- MongoDB connection string (for running the backend locally)

### Run the Frontend Locally

**Option 1 — VS Code Live Server**
```bash
git clone https://github.com/mehmoona-chand/Greenwallet-A-personal-carbon-footprint-tracker.git
cd Greenwallet-A-personal-carbon-footprint-tracker
# Right-click index.html → Open with Live Server
```

**Option 2 — Direct browser**
```bash
git clone https://github.com/mehmoona-chand/Greenwallet-A-personal-carbon-footprint-tracker.git
# Open index.html directly in your browser
```

### Run the Backend Locally

```bash
cd Greenwallet-A-personal-carbon-footprint-tracker/backend
npm install
# Create a .env file with MONGO_URI, JWT_SECRET, etc.
npm run dev   # uses nodemon
# or
npm start
```

---

## 📸 Screenshots

### 🏠 Home Page
![Home Page](screenshots/home.png)

---

### 🔐 Login & Sign Up
![Login Page](screenshots/login.png)

---

### 📊 Dashboard
![Dashboard](screenshots/dashboard.png)

---

### 🧮 Carbon Calculator
![Carbon Calculator](screenshots/calculator.png)

---

### 👤 Profile Page
![Profile](screenshots/profile.png)

---

### 🌟 Features Page
![Features](screenshots/features.png)

---

### ℹ️ About Page
![About](screenshots/about.png)

---

## 🗺️ Roadmap

- [x] Frontend UI — all pages complete
- [x] Responsive design across all pages
- [x] Dynamic auth-aware navbar
- [x] Carbon calculator with instant results
- [x] Achievement and XP system UI
- [x] Backend API (Node.js + Express)
- [x] MongoDB database integration
- [x] JWT authentication
- [x] Frontend connected to live backend
- [x] Deployed to Render (frontend + backend)
- [ ] Google OAuth integration
- [ ] Newsletter subscription
- [ ] Live leaderboard

---





---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes and commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 👩‍💻 Author

**Mehmoona Chand (Sylvia)**
BS Information Technology
Dev Weekends Fellow 2026 | Aspiring DevOps & Cloud Engineer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/mehmoonachand)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github)](https://github.com/mehmoona-chand)

---

<div align="center">

⭐ **Star this repo if you find it useful — it means a lot!**

Built with 💚 for a greener tomorrow

</div>
