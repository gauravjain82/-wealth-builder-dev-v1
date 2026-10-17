# Training Schedule — UI

| | |
|---|---|
| **Module** | `training-schedule` |
| **Source** | `src/features/training-schedule/` |
| **Routes** | `/training-schedule`, `/training-schedule/attend/:token` |
| **Backend module** | `training_schedule` → `wealth-builder-dev-v1-backend/docs/training_schedule/` |
| **API prefix** | `/api/training-schedule/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 2.0 |
| **Verified against** | commit `7b487dc` plus the uncommitted rebuild on `feature/training-schedule` — 2026-10-14 |

## 1. Routes and entry points

| Route | Guard | Layout | Component |
|---|---|---|---|
| `/training-schedule` | `ProtectedRoute` | `MainLayout` | `TrainingSchedulePage` |
| `/training-schedule/attend/:token` | `ProtectedRoute` | none — a focused page | `TrainingAttendancePage` |

The sidebar entry *Training Schedule* is in every plan's menu (`src/config/menu.ts`), unchanged.

## 2. Screens

**Schedule page.** Header with the viewer's time zone spelled out; week navigation; the week grid. Hosts
get *Inherit a training* and *New training*; administrators get an *All trainings* checkbox and
*Settings*. The grid shows 7 AM–11 PM and widens when a date falls outside that.

**Date card.** Title, start time in the viewer's zone, a ✓ when the viewer attended, a repeat glyph, the
host's name when it is not the viewer's own, and — when the training's clock differs from the viewer's —
an amber chip with the training's own time and zone abbreviation.

**Date details** (`OccurrenceModal`). When, host, recurrence, description, *Join meeting*, a sentence
saying why this date is on the viewer's schedule, then by role:

| Viewer | Sees |
|---|---|
| Owner, administrator | Who inherited it; attendance count, link and *View live attendance*; *Edit*, *Delete this date*, *Delete series* |
| Host who inherited it | Attendance (their BaseShop's) and the link; *Remove this date from my BaseShop*, *Stop inheriting the series* |
| BaseShop member | Details and the meeting link only |

**New / edit training.** Title, description, date, start time, length, **time zone**, meeting link,
repeat and number of dates (create only), colour. The time-zone block is bordered and tinted: blue with a
*Your time zone* badge when it matches the browser, amber with a *Use my time zone* shortcut when it does
not. It defaults to the browser's zone.

**Delete dialog.** States how many dates go (upcoming and completed), warns in red when attendance records
go with them, and lists the hosts whose BaseShops lose it. The confirm button carries the count.

**Attendance.** The link with a copy button, a live count, and names with the time each opened the link.

**Inherit.** Upline hosts first; a search box reaches any host. Picking one lists their trainings with
*Inherit all dates* and per-date checkboxes.

**Attendance tab** (hosts and admins; `?view=attendance`). Top to bottom:

1. *Whose BaseShop* and how many people, a **4 / 8 / 12 weeks** period switch, and — for an admin — an
   SMD search.
2. **Four tiles.** Attendance rate for the period with the change against the previous period · the
   last training as *came / expected* (opens that date) · *Stopped or never came* (red border when
   non-zero) · *Slipping* (amber). The last two filter the table and scroll to it.
3. **Needs attention.** Stopped, never, then slipping, most missed first. Each row: name, status chip,
   and the reason in words — *"Missed the last 3 trainings · last came Sep 23"*. Six shown, *Show all*
   for the rest; *"Everyone is on track."* when empty.
4. **Attendance per training.** One bar per date in the period, as a percentage of those expected;
   hover for *came of expected*, click for that date. *Show as table* swaps in a table.
5. **Everyone.** Status filter pills with counts, a search, and sortable columns: name, status, the
   last *window* dates as dots (filled came, hollow missed), rate, last came (*3 weeks ago*), total.

**Member detail.** The reason sentence; four numbers (rate over the window, missed in a row, last came,
trainings attended — noting any beyond their own schedule); every expected date as a solid (came) or
dashed (missed) chip; and a line chart of their rolling rate against the BaseShop's per-date rate.

**Date detail.** *Missed* and *Came* side by side; any name opens that member.

**Schedule-tab banner** (hosts). *"In your BaseShop, 4 people have stopped attending or never came and 2
are slipping."* — red when anyone has stopped, amber when only slipping, absent when everyone is on
track. Clicking opens the Attendance tab.

**Status chips.** Every status has an icon and a label as well as a colour: Stopped (octagon, red),
Never attended (slashed circle, red outline), Slipping (triangle, amber), On track (check, green), New
(sparkles, grey).

**Attendance landing page.** One of: recording (spinner) · *Thanks for joining!* with "Your attendance is
recorded." · *You're already marked as attended* · *Attendance isn't open right now* (with the next date) · *This link isn't valid* · a
generic failure with *Try again*.

## 3. States

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Week grid | "Loading…" beside the week; the previous week's grid is not kept | Blue notice, worded for hosts, members or the admin view | Red notice with *Try again* |
| Delete dialog | "Checking what would be deleted…", confirm disabled | — | Message; confirm stays disabled |
| Attendance list | "Loading…" | "Nobody has opened the link yet." | Notice; polling continues |
| Inherit | "Loading…" | "There are no hosts in your upline." / "No host matches that name." | Notice with the server's message |
| Attendance tab | "Loading attendance…" | "There is nobody in this BaseShop to track yet."; for an admin before choosing, a prompt to search | Notice with *Try again* |
| Per-training chart | — | "No trainings were held in this period." | (part of the tab) |
| Member / date detail | "Loading…" | "No trainings have been expected of them yet." / "Everyone expected came." | Notice |

A delete the administrator's policy forbids is not an error state: the dialog explains why and disables
the button.

## 4. Interaction rules

- **Edit changes the series, not one date.** The date and the recurrence are locked once created; a new
  time, length or zone re-times dates that have not started.
- **Deleting always asks**, and the confirmation names the count. There is no undo in the UI.
- **Inherit toggles apply immediately** — no save button — and toast the result.
- **Opening the attendance link is the action.** There is nothing to press.
- **Untick *Counts toward attendance*** on a training to keep it out of the metrics; changing it on an
  existing training changes past dates in the metrics too.
- **Statuses are never decided in the browser.** The page words what the backend decided.
- No `window.confirm` or `alert` remain in this module.

## 5. Responsive and print behaviour

The grid has a 860 px minimum width and scrolls horizontally below it. On the Attendance tab the tiles
go two-up, and the member table becomes a card list below `md`. Dialogs stack their fields in one
column under `sm`. The attendance landing page is built for a phone. No print styles.

## 6. Accessibility

Date cards are buttons with a visible focus ring and a title. Dialogs come from the shared `Modal` (focus
trap, focus return). The attendance count and the landing page's panel are `aria-live="polite"`. Colour
swatches are `aria-pressed` buttons with names. The time-zone difference is conveyed by text, not colour
alone. The grid is not keyboard-navigable as a grid: it is a sequence of buttons in time order per day.

On the Attendance tab, a status is never colour alone (icon and label), attendance dots differ by shape
(filled or hollow) and carry an `aria-label`, the BaseShop line in the member chart is dashed as well as
grey, the per-training chart has a table view, table rows open with Enter or Space, and sortable headers
carry `aria-sort`.

## 7. Styling and theming

Tailwind, with `dark:` variants throughout. The one stylesheet, `training-schedule.css`, holds only the
chart colour tokens (`--wb-ts-series`, `--wb-ts-reference`, grid, axis, surface), scoped under
`.wb-ts-viz` and switched by the app's `.dark` class or a `data-color-scheme` override; Recharts reads
them as `var()` in SVG attributes. The series blue is the reference palette's slot 1 (`#2a78d6` light,
`#3987e5` dark); the BaseShop average is a neutral, dashed reference line rather than a second hue.
Element ids are prefixed `wb-ts-`. The previous `pages/training-schedule.css` — 930 lines of unprefixed global classes
(`.event-form`, `.calendar-grid`) with dark-only colours — is deleted. Its unimported duplicate at
`src/features/education/pages/training-schedule.css` is still there and still dead.

A training's colour is applied as a left border and a 20 %-alpha fill, so the card's text stays the
theme's own colour and is readable on amber as well as on blue.
