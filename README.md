# ASCEND // PERSONAL EVOLUTION SYSTEM
### Architect: VINAYAK // ShubV

ASCEND is a proprietary, cloud-native discipline quantification engine. Unlike passive habit trackers, ASCEND is an active feedback system designed to measure personal consistency against calibrated difficulty.

---

## 1. System Philosophy

The core thesis of ASCEND is that **discipline is measurable**. 
By assigning difficulty multipliers to every action, the system normalizes output across different domains (physical, intellectual, creative). A "perfect day" isn't about checking boxes—it's about maximizing your **Discipline Index**.

### The Discipline Index Algorithm
Your Discipline Index (0-100) is a rolling 7-day weighted average calculated as:

$$
\text{Index} = \frac{\sum (\text{Daily Score} \times \text{Weight})}{7} \times 10
$$

Where:
- **Daily Score** = (Sum of Completed Protocol Difficulties) / (Sum of Active Protocol Difficulties)
- **Weight** = Recency factor (yesterday matters more than 7 days ago)

This math ensures that consistency is the only way to maintain a high score. One missed day causes a sharp drop, requiring multiple perfect days to recover.

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
- **Haptic-Visual Feedback**: ONE-TAP completion with instant state updates.
- **Attention System**: Automatically flags protocols with falling completion rates (<80%).
- **Current Streak Display**: Real-time counter of consecutive executions.

### 🧠 Intelligence Engine (Analytics)
Data visualization for behavioral patterns.
- **GitHub-Style Heatmap**: A 12-month grid visualization of discipline intensity (Theme Adaptive).
- **Consistency Delats**: Tracks week-over-week performance changes.
- **30-Day Trendline**: Visualizes momentum shifts.

### 🔐 Identity & Security
- **Cloud-Native**: Powered by a Supabase backend for cross-device synchronization.
- **Row Level Security (RLS)**: Database policies ensure zero data leakage between users.
- **Encrypted Auth**: Secure password hashing via bcrypt.

---

## 3. Technical Architecture

### Frontend (Interface)
- **Framework**: React 18 + TypeScript + Vite
- **State Management**: Context API + Optimistic UI Updates
- **Design System**: Custom "Obsidian" Theme (CSS Variables)

### Backend (Infrastructure)
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth (JWT Tokens)
- **Realtime**: WebSocket subscriptions for instant sync

---

## 4. Visual Language
**"Obsidian Glass"**
- **Palette**: Deep Black (#000000), Void (#0a0a0a), and Neon Accents.
- **Materials**: Glassmorphism (`backdrop-filter: blur(20px)`) for depth.
- **Typography**: `JetBrains Mono` for data, `Inter` for interface.

---
**STATUS: OPERATIONAL**
**VERSION: 2.1.0**
**ACCESS: PRIVATE // SINGLE-USER**
