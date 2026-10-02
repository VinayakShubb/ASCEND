---
version: 1
slug: "frontend-src-pages-landing"
primary_target: "frontend/src/pages/landing"
related_targets: []
---

## Scope

Public marketing landing page at `/` (mode: Persuade). Audience: anyone building habits, arriving cold. Action: Start free (sign up). Proof: the real scoring mechanism demonstrated with labeled sample data; no testimonials, user counts or pricing exist and none may be invented.

## Direction contract

THESIS: The landing page is a night track meet. The track, its lanes and the official results board are the page itself. It refuses the habit-app template (centred headline over a phone mockup and a row of feature cards) and the old neon cyber-HUD.

OWN-WORLD: Night-stadium ground (near-black, floodlight haze falling from the top corners, fine tartan grain). Tartan track red is the committed field that lanes are painted on; lane-line white draws lines, numerals and lettering. Three inks only for the world (night, track red, lane white); infield green and amber appear only as result states. Archivo condensed heavy for painted lane lettering and headings, Archivo normal width for text, Doto dot-matrix only for scoreboard figures. Lanes, start and finish lines, the results board and race bibs are the components. No cards, no glass, no gradient text.

STORY: The visitor learns that ASCEND scores discipline like a race result: habits run in lanes, harder habits weigh more (a staggered start makes effort comparable), every day gets a result, the Discipline Index is the 7-day average, and CIPHER explains it. They believe it because they watch the board compute it from sample lanes. They act: Start free.

FIRST VIEWPORT: Thin top nav: logo left; "How it works", "Log in" and the primary "Start free" right. Lower 60% of the viewport: four full-bleed track-red lanes running horizontally with white lane lines and huge painted lane numerals 1-4 at the start line on the left. The headline "Discipline, scored." is painted across lanes in condensed lane-white at display scale. Above the track, left: one line of subcopy (under 20 words) and the Start free button with a "See how it's scored" link. Upper right: the results board in dot-matrix showing a sample Discipline Index whose digits flip into place on load, labeled Sample.

FORM: Stadium scoreboard / night track meet. Position 1 on the grounded list (taken as the pick card). Seed key 74e06824. Signature interaction: a scroll-driven race. Four sample habits run in lanes staggered by difficulty weight; scrolling advances the week day by day, completed days cross the finish line, and the results board recomputes the daily score and Discipline Index live with per-digit flips. On touch the race runs on scroll; hover detail exists only for fine pointers. Raises: three-ink discipline (from the declined kiosk-print challenger); per-digit flip in fixed cells (from the split-flap challenger).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

Real product screenshots (demo account) may replace authored sample visuals later.
