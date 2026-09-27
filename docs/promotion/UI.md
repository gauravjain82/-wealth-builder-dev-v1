# Promotion — UI

| | |
|---|---|
| **Module** | `promotion` |
| **Source** | `src/features/promotion/pages/`, `components/` |
| **Routes** | `/promotion/dashboard`, `/promotion/team` |
| **Backend module** | `promotion` |
| **API prefix** | `/api/promotion/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/promotion/dashboard` | `ProtectedRoute` only | `PromotionDashboardPage` |
| `/promotion/team` | " | `TeamPromotionPage` |

The menu entry is gated on the cached `wb.hasPromotionAccess` flag, but the routes are not — so a user
without the flag can still reach them by URL, and the API decides what they get.

## 2. Screens

### 2.1 Dashboard — `pages/promotion-dashboard-page.tsx`

A header showing rank, days in rank, overall percentage and promotion status, then two independent halves:

| Half | Component | Shows |
|---|---|---|
| Skills | `SkillsCard` | each skill, its module count, and its modules |
| Routes | `RouteCard` × n | each alternative path, its items, and whether it is selected |

The two carry **separate percentages**. A person can be far along on skills and nowhere on a route.

### 2.2 Skills card — `components/skills-card.tsx`

Per skill: label, a `skill`/`action` tag, `modules_done` of `total_modules`, whether it is complete, and
whether it was **manually checked** by a leader rather than earned by watching.

Per module: title, subtitle, duration, status (`pending`/`watch`/`quiz`/`done`), and a quiz score when
there is one.

### 2.3 Quiz — `components/quiz-panel.tsx`

Questions with options, submitted together, returning a score out of a total.

**The correct answers arrive with the questions** (`correct_index`), so the quiz is not tamper-proof. See
[ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes).

### 2.4 Route card — `components/route-card.tsx`

Per route: name, a time label, whether it is **urgent**, whether the person is **eligible**, a note, a
selection control, `done_items` of `total_items`, and a percentage.

Per item: a label and either a **check** or a **numeric** value against a target, grouped by leg group.

Selecting a route is a commitment — only one may be selected.

### 2.5 Team view — `pages/team-promotion-page.tsx`

`TeamStats` above `TeamMemberCard`s.

| Element | Shows |
|---|---|
| Stats | total · ready · in progress · just started |
| Per member | name, rank, days in rank, videos done, skill %, route %, overall |
| Per member detail | skill progress, and their routes **without** `is_selected` |

Team member routes deliberately omit `is_selected` (`Omit<PromotionRoute, 'id' \| 'is_selected'>`) — a
leader sees progress, not the private choice of path.

Filter by rank, search by name, sort by progress, name or rank.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| `ready` | eligible for promotion | the promotion status says so |
| `close` | nearly there | " |
| `not_ready` | not yet | " |
| Module `pending` | not started | nothing done |
| Module `watch` | watched, quiz outstanding | **not yet done** |
| Module `quiz` | quiz in progress | " |
| Module `done` | complete | done |
| Manually checked | a leader ticked it | marked distinctly from earned completion |
| Route not eligible | `is_eligible` false | shown with its note |
| Route urgent | `is_urgent` | flagged |
| Route selected | `is_selected` | the committed path |
| **Numeric item updated** | a value entered | **progress recomputes immediately**, before the server replies |
| Unknown rank | not in the local map | **"Next Level"** |
| Empty team | no members in scope | empty stats |

## 4. Interaction rules

- **Keep skills and routes separate.** Two percentages, two questions; one must not stand in for the other.
- **Only one route is selected.** Selecting another replaces it.
- **A module with a quiz is not done until the quiz is passed.**
- **Compute `is_done` in one place.** The optimistic update recomputes it, and a second implementation
  would drift from the server.
- **Do not show a leader which route a team member chose.** The team payload omits it.
- **Distinguish manually checked from earned.** A leader's tick is not the same as watching the modules.

## 5. Responsive and print behaviour

Tailwind utilities; no module stylesheet. Cards stack on narrow widths — these are reading surfaces, and
the team view is the one that suffers most on a phone because each member card carries a lot.

No print styles.

## 6. Accessibility

Shared primitives for controls. The quiz uses standard radio inputs.

Not covered: progress is conveyed largely by percentages and bars, and no systematic pass has been made.
The `skill`/`action` tag and the urgent flag are both visual.

## 7. Styling and theming

No stylesheet — Tailwind plus `shared/components/ui`.

One local constant worth knowing: `promotion-ranks.ts` maps rank codes to the **next** rank's display name.
The backend already sends `level_name` on the track, so this map is a second source for the same
information, and an unmapped code renders as "Next Level".
