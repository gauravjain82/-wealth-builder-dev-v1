# Leaderboards — UI

| | |
|---|---|
| **Module** | `leaderboards` |
| **Source** | `src/features/leaderboards/components/`, `pages/`, `leaderboards.css` |
| **Routes** | `/leaderboards` + embedded card |
| **Backend module** | `wbreporting` |
| **API prefix** | `/api/wbreporting/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Component | Query params |
|---|---|---|---|
| `/leaderboards` | `LeaderboardsRoute` (`homev2:read`) | `LeaderboardsPage` | `view=report`, `metric=<key>`, `scope=<key>` |

**Embedded entry point.** `LeaderboardsCard` is mounted by `src/features/home-v2/` inside the
Home v2 page. It is the preferred integration: one metric, a short preview, and an expand
action that navigates to `/leaderboards` carrying the metric. There is no separate route for
it.

Query-string handling (`pages/leaderboards-page.tsx:33-43`):

- `view=report` opens the Full Report; anything else opens the board.
- `metric` is validated against an eight-key allow-list and falls back to `points`.
- `scope` is taken as-is, defaulting to `smd_base`.
- Read **once**, at mount. Later changes do not update the URL.

## 2. Screens

### 2.1 Embedded card — `leaderboards-card.tsx`

The home-page reading: one selected metric, the top few SMDs and MDs, nothing else.

| Element | Source of truth | Notes |
|---|---|---|
| Header | static | "Wealth Builders Leaderboards" |
| Period / source status | `period_label`, `source` | states `daily_fallback` plainly |
| Two short lists | `smd`, `md` | `LeaderList`, titled "Top SMD" / "Top MD" |
| Expand action | `can_expand` | navigates to `/leaderboards` |
| Full Report action | `can_open_full_report` | navigates with `?view=report` |

It carries **no filter matrix, no personal list and no proof rows** — by contract and for
the 750 ms warm target. The payload is a different, smaller endpoint, not a trimmed board.

### 2.2 Expanded board — `leaderboard-panel.tsx`

| Element | Source of truth | Notes |
|---|---|---|
| Range selector | `visible_ranges` | falls back to a single "Current month" option |
| Custom start / end + Apply | local draft state | see §4 |
| Scope buttons | `visible_scopes` | Net Base absent while switched off; fallback `['smd_base']` |
| Metric tabs, row 1 | `general_metrics` minus the milestone keys | the four additive metrics |
| Metric tabs, row 2 | the milestone keys within `general_metrics` | rendered only when present |
| Two Top-5 panels | `smd`, `md` | `LeaderList` |
| Viewer summary | `viewer` | the reader's own totals and ratios |

The milestone split (`leaderboard-panel.tsx:42`) is worth understanding: `MILESTONE_KEYS` is
**not** a metric list. The server returns milestones inside `general_metrics`; the set only
decides which tabs move to the second row. Deleting it changes the layout, not the data.

### 2.3 Full Report — `full-report.tsx`

| Element | Source of truth | Notes |
|---|---|---|
| Month selector | `available_months` | plus a "Current month to date" option; hidden in print |
| Four columns | `metrics[]` | Recruits, Points, Licenses, Convention |
| Per column: gauge | `current`, `goal`, `percent` | `Speedometer` |
| Per column: two panels | `smd`, `md` | Top 5 each |
| Per column: personal list | `personal` | rendered only when present and non-empty |
| Milestone summaries | `milestones[]` | `available: false` renders as "no data" |

The month selector stops where the data does — the backend clamps it to the later of January
2026 or 24 months back, so the control cannot request an empty month (decision L11).

### 2.4 Proof dialog — `detail-dialog.tsx`

Opens on any result button. Title is `<metric> — how this was calculated`; subtitle is the
agent and scope. Contains the definition, calculation cards, the formula, and the paginated
source rows with a `Load more`.

### 2.5 Settings — `leaderboard-settings.tsx`

Four sections, each saving independently:

| Section | Controls |
|---|---|
| Goals | the four gauge denominators |
| Scopes and milestones | `show_net_base`, `milestone_measurement_mode` |
| Detail privacy | the 7×3 matrix — seven relationships × `hidden`/`masked`/`full` |
| Date ranges | label, sort order and visibility per named range |

Offered only when `can_manage`. **Four of the contract's eight sections are deliberately
absent** — settings managers, metric definitions, recalculation and pipeline activity. See
[PHASES.md §4](PHASES.md#4-deliberately-not-built).

## 3. States

Every surface distinguishes these. They are not interchangeable, and collapsing any two of
them is a regression.

| State | Trigger | What the user sees |
|---|---|---|
| Loading | query in flight | a `role="status"` message per surface (`full-report.tsx:88`, `leaderboard-panel.tsx:231`) |
| Empty | a panel with no positive results | the panel renders with empty slots, not an error — only positive General results are shown |
| Partial / fallback | `source: daily_fallback` | the period status says so in words. **A normal state**, not a warning |
| No data | `MilestoneSummary.available === false` | "no data" with the backend's `reason` — never `0` |
| Unavailable | `DetailResponse.unavailable_reason` non-empty | a `role="status"` explanation in place of rows (`detail-dialog.tsx:97`) |
| Error | non-2xx | `role="alert"` with the backend's `detail`, falling back to "The leaderboard is unavailable right now." (`leaderboard-panel.tsx:238`) |
| Denied | guard resolves false | redirect to `/home`, no message — a platform-level rough edge ([platform UI §3](../platform/UI.md#3-states)) |
| Masked field | a row key is absent | `—` in that cell (`detail-dialog.tsx:41`) |

The distinction that matters most: **"no data" is not zero.** A milestone period before
stamping coverage began has no answer; rendering it as `0` would report "nobody completed
their first recruit" when the truth is "we did not record when they did" (decision L5).

## 4. Interaction rules

These are contract behaviours, not styling preferences. Each one exists because its absence
caused a specific problem.

- **Draft dates do nothing until Apply.** Typing changes a draft; `Apply` is disabled until
  both dates are set and is the only thing that changes the query
  (`leaderboard-panel.tsx:82`, `:179`). Without it, every keystroke fires a request and a
  half-typed year returns `invalid_date_range`.
- **Milestone mode is shown, not chosen.** It appears in the board's header as the mode in
  force, and is changed only in Settings. There is deliberately no per-view radio: two
  readers comparing screens must be looking at the same measurement.
- **The proof dialog opens immediately.** It renders with a loading state and never waits on
  the summary request. This is the moment a reader doubts a number, and a blank screen is the
  one thing they will not tolerate.
- **A new subject clears accumulated rows.** Changing agent, metric or range resets the
  cursor and the rows rather than appending to them (`detail-dialog.tsx:54`).
- **Pagination never blocks.** `Load more` does not prevent closing the dialog or using
  another view.
- **Controls follow the server.** Scopes, ranges and metric tabs come from the response. A
  control the deployment has switched off does not render.
- **Focus.** The dialog delegates focus entry, trapping and return to the shared `Modal`
  (`shared/components/ui/modal`), which wraps a Radix dialog. It does not manage focus
  itself.

## 5. Responsive and print behaviour

### Full Report grid

| Width | Columns | Source |
|---|---|---|
| > 1250px | 4 | `leaderboards.css` |
| 661–1250px | 2 | `leaderboards.css:520` |
| ≤ 660px | 1 | `leaderboards.css:526` |

### Container queries

The embedded card adapts to **its container**, not the viewport
(`leaderboards.css:60`, `:357`), because it is mounted inside a Home v2 slot whose width does
not track the page width. A page-level media query alone would size it wrongly.

### Speedometer geometry

Fixed by contract and **not a style choice** — changing a number here changes what the gauge
claims. SVG `viewBox 0 0 200 120`, centre `(100,100)`, track radius 78, zone radius 84, 20
intervals, 5 labelled majors. The needle maps 0% to −90° and 100%+ to +90°, capping visually
at 100% while the printed number may exceed the goal. Zones: red 0–50%, amber 50–80%, green
80–100%. It animates once and honours `prefers-reduced-motion`
(`leaderboards.css:84`, `:724`).

### Print

`@media print` at `leaderboards.css:766`, scoped to the feature root so printing a
leaderboard cannot restyle anything else. Portrait, ~7 mm margins. The four metric columns
are preserved left to right; the period is stated as text; the month selector, status line,
Help and interactive chrome are hidden via `.wb-lb-no-print`. Surfaces go white with dark
text and a print-safe gold (`#a16207`). The gauge zone colours carry
`print-color-adjust: exact` (`:810`) because a red zone printed grey is a different
statement. Layout for print is driven by the stylesheet, not by JavaScript, so the printed
result matches what the screen would produce at that width.

## 6. Accessibility

- Loading and informational messages use `role="status"`; errors use `role="alert"`
  (`full-report.tsx:88`, `:93`).
- The view switcher is a `<nav aria-label="Leaderboard view">`
  (`pages/leaderboards-page.tsx:47`).
- Each settings section is a `<section aria-label>` with an `<h3>`; each privacy radio has an
  explicit `aria-label` combining relationship and level
  (`leaderboard-settings.tsx:210`).
- Truncated names carry a `title` so the full value is reachable
  (`full-report.tsx:140`).
- The gauge's accessible label states the current value and the goal.
- Reduced motion is honoured for both the gauge sweep and the card transitions.
- Focus management in the dialog comes from the shared `Modal`.

Not covered: no automated accessibility check exists in the toolchain, and the guard's
full-screen loader is unannounced.

## 7. Styling and theming

One stylesheet, `src/features/leaderboards/leaderboards.css`, 940 lines, imported by the page
(`pages/leaderboards-page.tsx:22`). **Every selector is under `wb-lb-`**, which is what makes
the print block and the container queries safe to ship.

The module does not define a theme. It uses the shell's tokens and the shared `Button` and
`Modal` primitives, so the dark/gold reference palette from the source contract is followed
only where the host's own theme does not answer the question. `.wb-lb-no-print` is the one
utility class the module adds, and it is consumed by the print block alone.
