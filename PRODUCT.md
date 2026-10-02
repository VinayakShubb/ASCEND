# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: React 19 + TypeScript + Vite frontend (Vercel), FastAPI (Python) backend (Render), Supabase (Postgres + Auth), Groq for AI text. The frontend is being rebuilt on the same stack; styling/animation libraries were delegated: Tailwind CSS v4, Radix/shadcn-style primitives, React Router, Motion, GSAP (landing page only).

## Users

Anyone building habits: people who want to become more disciplined in daily life (training, study, reading, sleep, deep work, meditation). They open the app on a phone and on a laptop, usually briefly each day to check off what they did, and occasionally longer to look at their progress and CIPHER's analysis.

## Product Purpose

ASCEND turns daily discipline into something measurable. Users list their habits with a difficulty, check them off each day, and get one honest number, the Discipline Index, plus an AI analyst (CIPHER) that explains what is driving it and what to do next. Success: the user comes back every day, understands their numbers at a glance, and their consistency improves.

## Positioning

Not a checklist or a streak counter. Every habit carries a difficulty weight (easy 1.0x, medium 1.2x, hard 1.5x, extreme 2.0x), and the Discipline Index is a 7-day average of difficulty-weighted daily scores. CIPHER explains the numbers in plain language, but every number is computed deterministically by the backend; the AI never invents figures.

## Operating Context

- Daily loop: open app, see today's habits, check them off (often on a phone), glance at the score.
- Weekly/occasional loop: calendar heatmap, analytics trends, CIPHER analysis (re-runnable up to 20 times a day).
- Home screen shows a daily AI brief (quote + motivation, once per day); the analytics sidebar shows a once-a-day AI coach line.
- Timezone-aware: "today" is the user's local day.

## Capabilities and Constraints

- Habits: create, edit, archive, delete; daily frequency in practice (weekly/custom exist in the data model but are not supported by the scoring yet).
- Logging: toggle completion per day (today and past days via the calendar).
- Metrics: daily weighted score, completion %, Discipline Index, streaks, weekday patterns, execution personality type (after 14 days).
- Auth: email/username + password, Google sign-in.
- Terminology: the UI says "habits" (legacy name "protocols" is retired from the interface). "Discipline Index" (DI) is the core metric name. CIPHER is the analyst's name.
- Dark theme only (user decision). One theme, no theme switcher.
- Free to use; no pricing is shown anywhere.
- Must work on phones (touch) and laptops (mouse/hover) equally well.

## Brand Commitments

- Name: ASCEND. Analyst: CIPHER, with a small pixel-robot avatar whose mood follows the user's status (elite, solid, slipping, critical).
- Logo asset: `frontend/public/ascend.jpg` (line-art "A" monogram, cream on black).
- CIPHER's voice: an honest coach. Direct and specific, praises real wins, names problems plainly, never insults.
- Creator credit: "Built by Vinayak".

## Evidence on Hand

- A demo account with 60 days of realistic history (`backend/scripts/seed_demo_account.py`) for real screenshots of the product.
- No real users, testimonials, user counts, ratings or press exist. Never fabricate any.

## Product Principles

1. One honest number: everything in the product explains or moves the Discipline Index.
2. Numbers are computed, words are explained: every figure is accurate and says what it means.
3. Daily first: checking off today must be the fastest, clearest action anywhere in the app.
4. Coach, not judge: feedback is specific and actionable, never shaming.
5. Free and frictionless: no paywalls, no pricing, short path from landing page to first check-off.

## Accessibility & Inclusion

Respect reduced-motion preferences, keyboard navigation and touch targets of at least 44px. No product-specific standard beyond WCAG AA contrast was established.
