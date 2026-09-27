# Licensing — UI

| | |
|---|---|
| **Module** | `licensing` |
| **Source** | `src/features/licensing/` |
| **Routes** | 4 under `/licensing/*` |
| **Backend module** | — |
| **API prefix** | — |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/licensing/track` | `ProtectedRoute` only | `TrackMyLicensePage` |
| `/licensing/documents` | " | `LicensingDocumentsPage` |
| `/licensing/crash-course` | " | `CrashCoursePage` |
| `/licensing/chapter/:chapterId` | " | `ChapterCoursePage` |

## 2. Screens

### 2.1 Track My License — 384 lines

Fourteen chapters derived from a hard-coded `VIDEO_LIST` by `buildChapters()`, each showing whether its
videos have been watched, with an overall progress indication and a reset.

### 2.2 Crash Course — 411 lines

A course header from the `COURSE` constant, and modules from `MODULES`, each with its videos. Links into
the chapter player.

### 2.3 Chapter course — 488 lines

The largest page: a video player, per-video progress, and a **notes** field the learner writes into.

Notes are the most valuable thing this module stores and the most easily lost — they exist only in that
browser's `localStorage`.

### 2.4 Licensing Documents — 64 lines

Three document cards from the `DOCS` constant: title, description, link.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Fresh | no storage key | the whole curriculum, untouched |
| **Progress from another browser** | no key **here** | **identical to fresh — with no explanation** |
| In progress | a stored key | watched videos marked |
| Complete | all watched | full progress |
| Reset | the user reset | back to fresh; the key is removed |
| Notes saved | text entered | persisted locally, silently |
| Storage unavailable | private mode or blocked data | **unguarded — the read can throw** |

The second row is the one to understand: an absent key and a new learner are indistinguishable, so
switching device looks like losing everything and gives no reason.

## 4. Interaction rules

- **Write the whole progress object.** Each key holds one JSON object; partial writes would corrupt it.
- **Reset removes the key**, rather than writing an empty object.
- **Chapters come from `buildChapters()`**, never a second hard-coded list — the derivation is what keeps
  chapters and videos in step.
- **Notes save as the learner types.** There is no explicit save, so there must be no way to lose them
  within a session.

## 5. Responsive and print behaviour

Tailwind utilities; no module stylesheet. These are reading-and-watching pages, so they work on a phone —
which is also where the per-browser progress problem bites hardest, since a learner may start on a laptop
and continue on a phone.

No print styles.

## 6. Accessibility

Shared primitives and native elements. The video players and the notes textarea are standard.

Not covered: progress is conveyed largely by visual state on chapter cards, and no systematic pass has
been made.

## 7. Styling and theming

No stylesheet — Tailwind plus `shared/components/ui` throughout. Content, including document titles and
video URLs, is TypeScript constants rather than data, so **presentation and content change together in a
release**.
