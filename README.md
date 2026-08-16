# ASCEND // PERSONAL EVOLUTION SYSTEM
### Architect: VINAYAK // SHUBV
#### LINK = https://ascend-vgk.vercel.app/

ASCEND is a futuristic, AI-driven **habit tracker** and performance architecture that transforms your personal discipline into a quantified optimization problem. Unlike passive trackers, ASCEND is an active feedback system designed to measure personal consistency, identify execution gaps via the CIPHER analyst, and accelerate your evolution.

---

## 1. System Philosophy

The core thesis of ASCEND is that **discipline is measurable**. 
By assigning difficulty multipliers to every action, the system normalizes output across different domains (physical, intellectual, creative). A "perfect day" isn't about checking boxes—it's about maximizing your **Discipline Index (DI)**.

### The Discipline Index Algorithm
Your Discipline Index (0-100) is a rolling 7-day average of each day's weighted score:

```
Daily Weighted Score  = (sum of difficulty multipliers for completed protocols)
                       / (sum of difficulty multipliers for all active protocols) × 100

Discipline Index (DI) = average(Daily Weighted Score for the last 7 days), rounded
```

Difficulty multipliers: Easy `1.0x`, Medium `1.2x`, Hard `1.5x`, Extreme `2.0x`. Harder protocols
count for more of a day's score, so skipping one costs more than skipping an easy one. Every day in
the 7-day window counts equally — there's no separate recency weighting beyond the window itself
only covering the last 7 days. See `backend/services/calculations.py` for the exact implementation.

---

## 2. Core Modules

### 🛡️ Protocol Registry
Daily operations are defined as **Protocols**, not tasks.
- **Difficulty Calibration**:
  - **Easy (1.0x)**: Maintenance (Hydration, Reading)
  - **Medium (1.2x)**: Standard resistance (Workout)
  - **Hard (1.5x)**: High friction (Deep Work)
  - **Extreme (2.0x)**: Maximum effort (Sprints)
- **Archive System**: Protocols can be retired without losing historical data.

### 📊 Command Center (Dashboard)
The daily interface is designed for **focus and immediacy**.
- **Execution Status**: Real-time tracking of today's protocols and completion percentages.
- **Daily Mission Brief**: AI-generated summary of your objectives and current status.
- **Dynamic Feedback**: Visual alerts when protocols fall below critical completion thresholds.

### 🧠 CIPHER Intelligence Analyst
An active AI performance coach powered by Llama 3 (Groq).
- **Behavioral Analysis**: CIPHER reads your execution history to identify personality types (e.g., "Consistent Builder" vs "Burst Executor").
- **Autopsy Engine**: Detects "dead streaks" and pinpoint your single biggest execution mistake.
- **The Three Orders**: Ranked instructions generated every midnight to optimize your next 24 hours.

### � Logic Engine
The technical and philosophical documentation hub.
- **Protocol breakdown**: Detailed explanation of how the Discipline Index is calculated.
- **Avatar Calibration**: Breakdown of the CIPHER AI moods (Elite, Solid, Slipping, Critical) and their DI triggers.
- **System Rules**: The laws governing the ASCEND architecture.

---

## 3. Visual Identity

### 🤖 CIPHER Avatar
The face of the system is a blocky, pixel-art robot with reactive LED eyes.
- **Mood-Responsive**: The avatar's expression and glow shift based on your current DI.
- **Blinking Logic**: Occasional haptic-eye animations to give the AI a sense of "presence."
- **Evolutionary States**:
  - **Elite (80-100 DI)**: Green glow, happy smile, relaxed eyebrows.
  - **Critical (0-30 DI)**: Red glow, intense focus, aggressive stance.

### 🌌 Obsidian Glass Design
- **Palette**: Deep Black (#000000), Void (#0a0a0a), and Neon Accents.
- **Materials**: Glassmorphism (`backdrop-filter: blur(20px)`) applied to all core panels.
- **Typography**: `Orbitron` for titles, `JetBrains Mono` for data, `Inter` for interface.
- **Global Branding**: Persistent footer across all pages identifying the system version and architect.

---

## 4. Technical Architecture

```
Browser (React SPA)
   │  fetch() + Bearer token
   ▼
FastAPI backend  ──────►  Supabase (Postgres + Auth)
   │
   └────────────────────►  Groq API (Llama 3.1, server-side only)
```

### Frontend (`/frontend`) — Interface
- **Framework**: React 19 + TypeScript + Vite
- **Routing**: Internal state-based navigation with automatic scroll-restoration (`#hash` based, no router library)
- **Data**: Talks only to the FastAPI backend over `fetch()` (`src/lib/api.ts`) — it never touches Supabase or Groq directly
- **Deployment**: Vercel

### Backend (`/backend`) — Logic + Infrastructure
- **Framework**: FastAPI (Python), run with Uvicorn
- **Database / Auth**: Supabase (Postgres + Auth). The backend holds the Supabase service-role key and is the trust boundary — every route validates the caller's JWT itself instead of relying on Postgres row-level security
- **AI Integration**: Groq API (Llama 3.1) — the API key now lives only on the server, never shipped to the browser
- **Structure**: `main.py` entrypoint, `routes/` (one file per resource), `models/` (Pydantic schemas), `services/` (business logic — habit math, AI prompt building, Groq client), `tests/` (pytest)

---
**STATUS: OPERATIONAL**
**VERSION: 3.0.0**
**ARCHITECT: VINAYAK // SHUBV**
**DEPLOYMENT: GLOBAL // VERCEL**

---

## 5. Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows: .venv\Scripts\activate | macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY
python -m uvicorn main:app --reload   # http://localhost:8000
```

Run the test suite:

```bash
cd backend
pytest              # 93 tests, no real Supabase/Groq credentials needed -- see tests/fakes.py
```

The database schema lives in `backend/supabase_schema.sql` — run it once against a fresh Supabase
project to create the `profiles`, `habits`, and `habit_logs` tables.

### Frontend

```bash
cd frontend
npm install

cp .env.example .env.local    # VITE_API_URL defaults to http://localhost:8000
npm run dev                   # http://localhost:5173
```

The frontend expects the backend to already be running at `VITE_API_URL`. Both need to be running
at the same time for the app to work end-to-end.
