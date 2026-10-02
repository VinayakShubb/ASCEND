# ASCEND frontend rebuild: shared build guide

Read this fully before writing code. Several builders work in parallel in the same working tree; consistency and staying inside your own files matter more than anything else.

## Read first
- `ascend/PRODUCT.md` (product truth, terminology, constraints).
- `ascend/.impeccable/surfaces/frontend-src-pages-landing.md` and `ascend/.impeccable/surfaces/frontend-src-pages-app.md` (direction contracts; the THESIS / OWN-WORLD / FIRST VIEWPORT blocks are binding).
- `C:/Vinayak/Coding/ASCEND/.claude/skills/impeccable/reference/craft-floor.md` (quality floor and bans). Read it before any UI edit.
- The foundation code: `src/styles/app.css` (tokens), `src/design/*`, `src/components/ui/*`, `src/components/brand/*`, `src/components/app/LaneRow.tsx`, `src/layouts/AppShell.tsx`, `src/App.tsx` (routes).
- The legacy page you are replacing in `src/components/legacy/**` for features and data flow. It is reference only: never import from `legacy`, never copy its look.

## The world (summary; the briefs are authoritative)
A night track meet. Night ground (`bg-night-*`), tartan track red (`track`, `track-bright`, `.tartan` surface), lane white (`text-lane`, `text-lane-dim`, `text-lane-mute`, hairlines `border-lane-line` / `border-lane-line-strong`). Green (`infield`), amber (`amber`) and red (`dnf`) are result STATES only, never decoration.
- Headings and big figures: `font-display` utility (Archivo condensed 800), usually `uppercase`. Body: Archivo (default `font-sans`). Scoreboard figures only: `font-board` (Doto dot-matrix) via `<BoardNumber>` inside `<ResultsBoard>`. Tabular numbers: `tabular` utility.
- Lanes, lane numbers, start/finish lines, the results board and race bibs are the component vocabulary. Rows divided by hairlines beat boxes.
- App pages (Operate mode) are clean, minimal and obvious: one column of work, generous rows, standard controls. The world shows only through type, palette, density and the lane/board signature. Landing (Persuade) may carry the world much further.

## Hard rules
1. Edit ONLY the files assigned to you. You may create new files only inside your assigned folders. Never edit `src/components/ui`, `src/components/brand`, `src/components/app/LaneRow.tsx`, `src/design`, `src/layouts`, `src/styles/app.css`, `src/App.tsx`, `src/main.tsx`, `src/lib`, `src/context`, `src/hooks`, `package.json`. If you truly need a change there, describe it in your final report instead.
2. No new npm dependencies. Available: react 19, react-router 8, motion (`motion/react`), gsap + `@gsap/react` + `lenis` (landing only), `@phosphor-icons/react` (the only icon set; never lucide, never emoji as icons), `@radix-ui/react-dialog|dropdown-menu|tooltip|switch`, recharts, date-fns, clsx/tailwind-merge (`cn` in `src/lib/cn.ts`).
3. Styling with Tailwind v4 classes using the tokens above. A page-local CSS file is allowed only for keyframes Tailwind cannot express; import it from your page.
4. Bans (from craft-floor): no eyebrow/kicker labels above headings; no section numbers like 01/02; no rows of identical icon+heading+text cards; no nested cards; no gradient text; no glass/blur as decoration; no colored thick border-left; no hard offset shadows; no em-dashes or en-dashes anywhere in visible copy (use commas, periods, colons, parentheses); no fake numbers, testimonials, user counts, ratings or pricing. Sample data on the landing page must be labeled as sample.
5. Copy: plain, specific, the product's own words. The UI says "habits" (never "protocols"), "Discipline Index" (DI), "CIPHER". Buttons name their action ("Add habit", "Log in"). Errors say what happened and what to do.
6. States: every data view has loading (skeletons shaped like the content), empty (says how to fill it), and error (with retry) states. Disabled and focus states on every control.
7. Touch and mouse: hover effects only through Tailwind `hover:` (v4 applies it only on devices that support hover). Never put information only in a hover tooltip; phones must get it another way. Touch targets at least 44px. Use `whileTap` for press feedback (Motion). No custom cursors.
8. Motion: use `src/design/motion.ts` (ease, duration, press, settle, reveal). Animate transform and opacity (clip-path and filter are fine when smooth). Content is visible by default; motion only adds arrival. One authored moment per page, not the same fade on every block. Respect reduced motion (`useReducedMotion()` from motion/react; `MotionConfig reducedMotion="user"` is already global). Never `window.addEventListener('scroll')`; use Motion `useScroll`, GSAP ScrollTrigger, or IntersectionObserver. Clean up every effect.
9. Responsive: works from 360px to 1920px wide; no horizontal page scroll; use `min-h-dvh` not `h-screen`; multi-column layouts collapse explicitly below `md`.
10. Accessibility: semantic elements, labels on inputs, `aria-*` on custom controls, contrast AA, visible focus (global `:focus-visible` exists).
11. Data: use the existing contexts and API helpers. `useAuth()` from `src/context/AuthContext` (user, login, register, loginWithGoogle, logout, isAuthenticated). `useData()` from `src/context/DataContext` (habits, logs, loading, addHabit, updateHabit, deleteHabit, toggleHabitCompletion, getHabitStatus). `statsApi` / `aiApi` from `src/lib/api.ts` (stats summary/range/streaks/ceiling; ai brief/coach/cipher/cipherLatest). `useStats`/`useStreaks` hooks in `src/hooks/useStats.ts`, `useTrackingStart` in `src/hooks/useTrackingStart.ts`. Dates: `format(new Date(), 'yyyy-MM-dd')` from date-fns for "today" (local).
12. Verify before finishing: from `ascend/frontend` run `npx tsc -b` and `npx eslint <your files>`; both must be clean for your files. Do not run git commands (no commits, no stash, no checkout).

## Report back
Files created/changed, anything you needed from a shared file but could not edit, and known gaps.
