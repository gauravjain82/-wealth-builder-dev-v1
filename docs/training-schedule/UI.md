# Training Schedule — UI

| | |
|---|---|
| **Module** | `training-schedule` |
| **Source** | `src/features/training-schedule/` |
| **Routes** | `/training-schedule` |
| **Backend module** | none |
| **API prefix** | none |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/training-schedule` | `ProtectedRoute` only | `TrainingSchedulePage` |

## 2. Screens

One page listing recurring training sessions — day, time, topic and how to join.

## 3. States

*Not applicable.* Nothing is fetched, so there is no loading, empty or error state. A session that no longer
runs is wrong in the source until somebody edits it.

## 4. Interaction rules

- **Join links must be kept current.** Nothing validates them, and a stale meeting link is the most likely
  defect in a static schedule.

## 5. Responsive and print behaviour

A timetable, so it must hold up on a phone. No print styles, though a schedule is plausibly printed.

## 6. Accessibility

Tabular information. If it is rendered as a real table with headers it reads correctly; if as styled divs, it
does not. Not audited.

## 7. Styling and theming

`pages/training-schedule.css`, imported by the page (`training-schedule-page.tsx:7`).

**There is a byte-identical copy of it in another module.** `education/pages/training-schedule.css` is the
same 18,008 bytes, and **nothing imports it** — verified by grep. So a reader searching for
`training-schedule.css` finds two files, and the one in [education](../education/UI.md#7-styling-and-theming)
is dead. Editing that copy changes nothing, silently.

Deleting the education copy is this module's one outstanding item.

Content — the entire timetable — is in the component, so every schedule change is a release. This module is
not on [admin](../admin/)'s content engine.
