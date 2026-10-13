# Training Schedule — UI

| | |
|---|---|
| **Module** | `training-schedule` |
| **Source** | `src/features/training-schedule/` |
| **Routes** | `/training-schedule`, `/training-schedule/attend/:token` |
| **Backend module** | `training_schedule` → `mlm_platform/docs/training_schedule/` |
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

**Attendance landing page.** One of: recording (spinner) · *Thanks for joining!* · *You're already marked
as attended* · *Attendance isn't open right now* (with the next date) · *This link isn't valid* · a
generic failure with *Try again*.

## 3. States

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Week grid | "Loading…" beside the week; the previous week's grid is not kept | Blue notice, worded for hosts, members or the admin view | Red notice with *Try again* |
| Delete dialog | "Checking what would be deleted…", confirm disabled | — | Message; confirm stays disabled |
| Attendance list | "Loading…" | "Nobody has opened the link yet." | Notice; polling continues |
| Inherit | "Loading…" | "There are no hosts in your upline." / "No host matches that name." | Notice with the server's message |

A delete the administrator's policy forbids is not an error state: the dialog explains why and disables
the button.

## 4. Interaction rules

- **Edit changes the series, not one date.** The date and the recurrence are locked once created; a new
  time, length or zone re-times dates that have not started.
- **Deleting always asks**, and the confirmation names the count. There is no undo in the UI.
- **Inherit toggles apply immediately** — no save button — and toast the result.
- **Opening the attendance link is the action.** There is nothing to press.
- No `window.confirm` or `alert` remain in this module.

## 5. Responsive and print behaviour

The grid has a 860 px minimum width and scrolls horizontally below it. Dialogs stack their fields in one
column under `sm`. The attendance landing page is built for a phone. No print styles.

## 6. Accessibility

Date cards are buttons with a visible focus ring and a title. Dialogs come from the shared `Modal` (focus
trap, focus return). The attendance count and the landing page's panel are `aria-live="polite"`. Colour
swatches are `aria-pressed` buttons with names. The time-zone difference is conveyed by text, not colour
alone. The grid is not keyboard-navigable as a grid: it is a sequence of buttons in time order per day.

## 7. Styling and theming

Tailwind only, with `dark:` variants throughout; the module has **no stylesheet**. Element ids are
prefixed `wb-ts-`. The previous `pages/training-schedule.css` — 930 lines of unprefixed global classes
(`.event-form`, `.calendar-grid`) with dark-only colours — is deleted. Its unimported duplicate at
`src/features/education/pages/training-schedule.css` is still there and still dead.

A training's colour is applied as a left border and a 20 %-alpha fill, so the card's text stays the
theme's own colour and is readable on amber as well as on blue.
