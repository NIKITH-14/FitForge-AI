# 🏋️ FitForge AI — AI-Powered Smart Gym Platform

FitForge AI is a full-stack, AI-powered fitness web application that integrates with a custom smart gym machine to deliver real-time form coaching, personalized workout plans, intelligent nutrition tracking, and a complete fitness dashboard — all powered by Google Gemini AI.

---

## 🚀 How to Run

You need **two terminals** open simultaneously.

### 1. Start the Backend (API — Port 5000)

```bash
cd FitForge-AI/backend
npm install        # first time only
npm run dev
```

> The SQLite database (`fitness_platform.db`) is **created automatically** on first run — no setup needed.

### 2. Start the Frontend (Next.js — Port 3000)

```bash
cd FitForge-AI/frontend
npm install        # first time only
npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## 🗂️ Project Structure

```
FitForge-AI/
├── backend/                    # Node.js REST API
│   ├── server.js               # Entry point (runs on port 5000)
│   ├── fitness_platform.db     # SQLite database (auto-created)
│   ├── .env                    # Environment variables
│   └── src/
│       ├── app.js              # Express app setup (CORS, auth, rate limiting)
│       ├── config/
│       │   ├── db.js           # SQLite database + pg-compatible query wrapper
│       │   ├── jwt.js          # Access & refresh token generation/verification
│       │   └── gemini.js       # Google Gemini AI client
│       ├── middleware/
│       │   ├── auth.js         # JWT authentication middleware
│       │   └── errorHandler.js # Global error handler
│       ├── modules/
│       │   ├── auth/           # Register, Login, Logout, Token Refresh
│       │   ├── user/           # Profile management, onboarding
│       │   ├── bmi/            # BMI & BMR calculator
│       │   ├── workout/        # AI workout plan generator
│       │   ├── diet/           # Diet plan & macro calculator
│       │   ├── nutrition/      # Food log (manual + AI image analysis)
│       │   ├── machine/        # Smart gym machine session ingestion
│       │   └── ai/             # AI recommendation engine
│       └── routes/
│           └── index.js        # API route registration
│
└── frontend/                   # Next.js 16 app (TypeScript + Tailwind)
    ├── app/
    │   ├── page.tsx            # Landing page
    │   ├── login/              # Login page
    │   ├── register/           # Registration page
    │   ├── onboarding/         # User profile setup (height, weight, goal)
    │   ├── dashboard/          # Main fitness dashboard
    │   └── help/               # Help & support page
    └── lib/
        ├── AuthContext.tsx     # Global auth state (JWT + user session)
        └── api.ts              # Axios API client
```

---

## ✨ Features

| Feature | Description |
|---|---|
| **Authentication** | Secure register/login with JWT access tokens (15 min) + HTTP-only refresh tokens (7 days) |
| **User Onboarding** | Collects height, weight, age, gender, and fitness goal to personalize everything |
| **BMI & Body Analysis** | Calculates BMI, BMR, TDEE, ideal weight range, and categorizes your fitness |
| **AI Workout Plans** | Goal-based plans (Strength / Aesthetic / Fat Loss) with exercises, sets, reps, and rest times |
| **Diet & Macro Planner** | Calculates daily calories and macros (protein, fat, carbs) using Mifflin-St Jeor formula |
| **Food Logging** | Manual food entry or snap a meal photo — Gemini Vision AI identifies food and estimates macros |
| **Smart Machine Integration** | REST endpoint for the custom gym machine to push session data (reps, resistance, TUT) |
| **AI Form Analysis** | Ingest joint angle data from MediaPipe; scores form 0–100 per rep and detects errors |
| **AI Recommendations** | Rule-based engine analyzes session history and generates personalized coaching tips |
| **Session History** | Full history of machine sessions with form scores and error analysis |

---

## ⚙️ Environment Variables

The backend is configured via `backend/.env`:

```env
PORT=5000
NODE_ENV=development

# SQLite (no setup needed — file is auto-created)
# DATABASE_URL is no longer used after the SQLite migration

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Machine Integration
MACHINE_SECRET=your_machine_api_secret

# CORS
FRONTEND_URL=http://localhost:3000
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login and get tokens |
| `POST` | `/api/auth/logout` | Clear refresh token cookie |
| `POST` | `/api/auth/refresh` | Get new access token |

### User
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/user/me` | Get current user profile |
| `PUT` | `/api/user/onboard` | Save height, weight, goal, etc. |
| `POST` | `/api/user/intro-complete` | Mark onboarding video as watched |

### Features (all require `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/bmi/calculate` | Calculate & save BMI |
| `GET` | `/api/bmi` | Get latest BMI record |
| `POST` | `/api/workout/generate` | Generate a workout plan |
| `GET` | `/api/workout` | Get current workout plan |
| `POST` | `/api/diet/generate` | Generate diet & macro plan |
| `GET` | `/api/diet` | Get current diet plan |
| `GET` | `/api/nutrition/log` | Get today's food log |
| `POST` | `/api/nutrition/manual` | Add food entry manually |
| `POST` | `/api/nutrition/upload` | Upload meal photo for AI analysis |
| `POST` | `/api/ai/recommend` | Get AI coaching recommendations |
| `GET` | `/api/ai/recommendations` | Get past recommendations |
| `GET` | `/api/machine/sessions` | Get gym machine sessions |

### Machine (requires `x-machine-token` header)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/machine/session` | Ingest workout session from hardware |
| `POST` | `/api/machine/form` | Ingest form analysis data from MediaPipe |

---

## 🛠️ Tech Stack

**Backend**
- Node.js + Express 5
- SQLite (via `sqlite3`) — file-based, no server needed
- JWT authentication (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- Input validation (`zod`)
- Google Gemini AI (`@google/generative-ai`)
- Security: `helmet`, `express-rate-limit`, `cors`, `cookie-parser`

**Frontend**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Axios for API calls
- Recharts for data visualization
- Lucide React icons
- React Hot Toast for notifications

---

## 🔧 What Was Fixed / Built

1. **SQLite Migration** — The backend originally used PostgreSQL. It was migrated to SQLite so the app runs without any database server or password setup. The database file is created automatically on first start.
2. **All 8 Controllers Rewritten** — Converted from PostgreSQL `$1,$2` syntax to SQLite `?` syntax across all modules: `auth`, `user`, `bmi`, `workout`, `diet`, `nutrition`, `machine`, and `ai`.
3. **Express 5 Compatibility** — Fixed a wildcard route bug (`app.use('*')` → `app.use(...)`) incompatible with Express 5.
4. **pg-compatible Wrapper** — A custom `db.js` wrapper translates `pool.query()` calls to SQLite, making all controllers work without any rewrite of their business logic.
5. **Auto Schema Creation** — All database tables are created automatically when the backend starts for the first time.

---

## 📝 Notes

- The `fitness_platform.db` file is your entire database. Back it up to preserve user data.
- The Gemini API key is required for food image analysis and AI features.
- The smart machine integration requires a compatible device sending data to `/api/machine/session`.