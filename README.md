# 🏆 PlayNow — Sports Booking Platform

## ▶️ HOW TO RUN

### Step 1 — Install Node.js
Download from https://nodejs.org (LTS version)
Check: `node --version`

### Step 2 — Setup .env file
```
cp .env.example .env
```
Open .env and add your MongoDB Atlas connection string.

### Step 3 — Install dependencies
```
npm install
```

### Step 4 — Run server
```
node server.js
```

### Step 5 — Open browser
```
http://localhost:3000
```

---

## 🌐 MongoDB Atlas Setup (Free)

1. Go to https://cloud.mongodb.com
2. Sign up free
3. Create a cluster (free M0 tier)
4. Click Connect → Drivers → Copy connection string
5. Paste into .env as MONGODB_URI
6. Replace <password> with your DB password

---

## 👥 User Roles

| Role | Unique ID Format | Access |
|------|-----------------|--------|
| Player | PN-USERNAME-1234 | Book turfs, host games, stranger matches |
| Owner | OWN-VENUENAME-1234 | List & manage venues (needs admin approval) |
| Admin | ADM-NAME | Full access — approve owners, see all data |

## 🔑 Admin Setup
- Set ADMIN_SECRET in .env (only you and friend know this)
- Signup with role = Admin and enter that secret
- Go to /admin for control panel

---

## 📁 Files
- server.js — Node.js backend (MongoDB + JWT auth)
- auth.html — Login/Signup with role selection
- dashboard.html — Player dashboard
- admin.html — Admin control panel
- turfs.html — Browse venues
- booking.html — Book a slot
- .env.example — Environment variables template

## 🔌 API Endpoints
- POST /api/auth/register — Create account
- POST /api/auth/login — Login
- GET  /api/auth/me — Get my profile
- GET  /api/turfs — Get all turfs
- POST /api/bookings — Create booking
- POST /api/games — Host a game
- GET  /api/admin/users — All users (admin only)
- POST /api/admin/approve-owner/:id — Approve owner (admin only)
