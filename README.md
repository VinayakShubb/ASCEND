# ASCEND

**Personal Discipline Evolution System**

ASCEND is a premium, single-user habit tracking web application designed to quantify, visualize, and optimize daily discipline. It transforms everyday habits into measurable "protocols" with weighted scoring, streak tracking, and deep analytics — giving you a single number that captures your true consistency.

---

## What It Does

ASCEND lets you define daily habits (called **Protocols**), assign them difficulty levels, and track completion every day. It then computes a suite of performance metrics to help you understand your discipline patterns over time.

### Core Concepts

| Concept | Description |
|---|---|
| **Protocols** | Daily habits you commit to (e.g., Morning Meditation, Workout, Reading) |
| **Difficulty Multiplier** | Each protocol is rated Easy (1.0×), Medium (1.2×), Hard (1.5×), or Extreme (2.0×) — harder habits contribute more to your score |
| **Discipline Index** | A 7-day rolling weighted average of your daily completion scores — your single number of truth |
| **Streaks** | Consecutive days a protocol has been completed without a break |
| **Consistency** | 7-day and 30-day completion percentages per protocol |

---

## Pages & Features

### 🏠 Landing Page
Animated hero with floating glow orbs, scroll-reveal feature cards, and a central call-to-action. Pure branding — no metrics.

### 📊 Command Center (Dashboard)
- Today's completion percentage and progress bar
- One-tap protocol completion toggles
- Streak badges per protocol
- Add / delete protocols

### 📅 Calendar (Contribution Heatmap)
GitHub-style heatmap starting from January 2026. Each cell represents a day, color-coded by completion intensity:
- **Empty** → no activity
- **Light → Dark accent** → increasing completion %
- **Red ×** → missed day (past day with 0% completion)
- Click any cell to view the day's protocol breakdown
- Past days are **locked** (read-only)

### 📈 Intelligence (Analytics)
- 30-day performance trend chart
- Per-protocol breakdown: 7d/30d consistency, weekly completions, all-time count
- Color-coded progress bars and 7-day pattern dots
- System-generated insights

### ⚡ Discipline Index (Slide-in Panel)
- Animated ring showing your current Discipline Index
- Weekly heatmap (last 7 days)
- Daily load breakdown
- Attention-required alerts for underperforming protocols

### ⚙️ System Config (Settings)
- Theme switching
- Data export / import (JSON)
- Full data reset

### ℹ️ About
Explains every metric, difficulty multipliers, and how each page works.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Vanilla CSS with CSS custom properties (dark theme) |
| Charts | Recharts |
| Icons | Lucide React |
| Fonts | Inter, JetBrains Mono (Google Fonts) |
| Storage | Browser localStorage (no backend) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build
```

The app runs at `http://localhost:5173`.

## Login Credentials

| Username | Password |
|---|---|
| `SHUB` | `SHUB123` |
| `MANJU` | `MANJU123` |

> Authentication is client-side only. All data is stored in the browser's localStorage.

---

## Project Structure

```
ascend/
├── src/
│   ├── components/
│   │   ├── Auth/          # Login page
│   │   ├── Dashboard/     # All page components (Dashboard, Calendar, Analytics, About, Settings)
│   │   └── Layout/        # MainLayout, Sidebar, Navbar, AnalyticsPanel
│   ├── context/           # AuthContext, DataContext (state management)
│   ├── styles/            # global.css, variables.css (design system)
│   ├── utils/             # calculations.ts, storage.ts
│   ├── types.ts           # TypeScript interfaces
│   └── main.tsx           # Entry point
├── index.html
└── package.json
```

---

## Design Philosophy

ASCEND is built around three principles:

1. **Quantify Everything** — Every action is scored, weighted, and tracked. No guesswork.
2. **Friction-Free Logging** — One tap to complete a protocol. The system handles the math.
3. **Visual Momentum** — Streaks, heatmaps, and animated metrics create a feedback loop that turns discipline into habit.

---

<p align="center">
  <strong>ASCEND</strong> · Private · Single-User Architecture
</p>
