---
version: 1
slug: "frontend-src-pages-app"
primary_target: "frontend/src/pages/app"
related_targets: []
---

## Scope

Signed-in product at `/app/*` (mode: Operate): Today, Habits, Calendar, Insights, CIPHER, Settings. Task: check off today's habits in one tap each, understand the Discipline Index at a glance, reach history and analysis in one tap. Used daily on phones (touch) and laptops (mouse).

## Direction contract

THESIS: The app is the athlete's side of the meet: today's lanes, the results board and the season record. Clean, minimal and obvious to use; it refuses the dashboard of identical cards and every decorative widget.

OWN-WORLD: The landing world held to four contributions: type (Archivo condensed numerals and headings, Archivo text, Doto only on the results board), palette (night ground with floodlight haze and grain only at the top of the shell, track red for the primary action and selection, lane white text and hairline lane dividers, green and amber strictly as states), density (generous rows, one column of work), and one signature move. Navigation and controls stay standard: side rail on desktop, bottom tab bar on phones, real buttons, checkboxes, dialogs and inputs.

STORY: The user opens Today, sees the board (Discipline Index, today's score, what is left), taps each habit they finished and watches the board move. Everything else (habits, calendar, insights, CIPHER) is one tap away and explains its numbers in plain words.

FIRST VIEWPORT: Desktop: left rail (logo, Today, Habits, Calendar, Insights, CIPHER, Settings). Main column: the results board strip on top (Discipline Index large in dot-matrix, today's score, done count, max possible today), the daily brief as one quiet line under it, then today's habits as lanes: lane number, habit name, weight tag, streak, and a finish-line check control at the right edge. Right rail: the coach panel (week strip, needs attention, coach line). Phone: board strip, then lanes; bottom tab bar.

FORM: Same world as the landing page (seed key 74e06824). Signature move: habits are lanes; checking one crosses the finish line (a lane-white sweep across the row, the check fills track red) and the board digits flip to the new score.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

Weekly/custom habit frequency is not scored yet; the UI offers daily only.
