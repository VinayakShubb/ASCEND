# ASCEND
### Personal Evolution System
**by VINAYAK // ShubV**

ASCEND is a cloud-native, discipline-quantifying system designed to track personal evolution. It goes beyond simple habit tracking by introducing weighted difficulty ratings, detailed analytics, and a "Discipline Index" that serves as a single metric for your consistency.

![ASCEND Banner](public/logo.png) 

## 🚀 Features

### 1. Protocol Architecture
Define your daily operations with precision.
- **Weighted Difficulty**: Assign multipliers (1.0x - 2.0x) to habits.
- **Frequency Control**: Set specific days for protocols (e.g., "Mon, Wed, Fri").
- **Archival System**: Retire old habits without losing their data history.

### 2. The Command Center
Your daily heads-up display.
- **Focus Mode**: only shows today's active protocols.
- **Quick Action**: One-tap completion triggers haptic-style visual feedback.
- **Smart Alerts**: "Attention Required" section highlights falling streaks.

### 3. Intelligence Engine
Data-driven insights into your behavior.
- **Discipline Index**: A 0-100 score representing your weighted 7-day consistency.
- **Heatmaps**: GitHub-style activity grids for every month.
- **Streak Analytics**: tracks current and best streaks for every protocol.

### 4. Cloud Identity
- **Universal Sync**: Seamlessly switch between desktop and mobile.
- **Secure Auth**: Powered by Supabase Auth with Row Level Security.
- **Profile System**: Custom User IDs and avatars.

---

## 🛠️ Project Structure

```
ascend/
├── src/
│   ├── components/      # UI Modules (Dashboard, Analytics, Auth)
│   ├── context/         # Global State (Auth, Data Sync)
│   ├── lib/             # Supabase Client Configuration
│   ├── styles/          # Global CSS & Design System
│   └── utils/           # Math Engines (Scoring, Streaks)
├── supabase_schema.sql  # Database Definitions
└── .env.local           # Environment Variables
```

## ⚡ Quick Start

### Prerequisites
- Node.js 16+
- A free [Supabase](https://supabase.com) account

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ascend.git
   cd ascend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Database**
   - Create a new Supabase project.
   - Go to the **SQL Editor** in Supabase and run the content of `supabase_schema.sql`.

4. **Set Environment Keys**
   - Rename `.env.example` to `.env.local` (or create new).
   - Add your Supabase URL and Anon Key:
     ```env
     VITE_SUPABASE_URL=your_project_url
     VITE_SUPABASE_ANON_KEY=your_public_key
     ```

5. **Launch System**
   ```bash
   npm run dev
   ```

---

## 🧠 Design Philosophy
ASCEND is built with the **"Obsidian"** design language:
- **Dark Mode Only**: Designed for focus, minimizing eye strain.
- **Data Density**: High information density without clutter.
- **Immediacy**: Interactions should be instant (optimistic UI updates).

## 🔒 Security
- **RLS (Row Level Security)**: Database policies ensure users can ONLY access their own data.
- **No Plaintext Passwords**: All credentials are hashed via bcrypt.

---
**Version**: 2.0.0 (Cloud-Native)
**License**: MIT
**Credits**: Built by VINAYAK // ShubV
