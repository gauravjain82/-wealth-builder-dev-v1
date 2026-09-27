# Education — UI

| | |
|---|---|
| **Module** | `education` |
| **Source** | `src/features/education/` |
| **Routes** | 5 |
| **Backend module** | none |
| **API prefix** | none |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Page |
|---|---|---|
| `/education` | `ProtectedRoute` | `EducationPage` |
| `/learn/education` | `ProtectedRoute` | `PublicEducationPage` |
| `/learn/public-education` | **none** | `PublicEducationPage` |
| `/learn/business` | `ProtectedRoute` | `PublicBusinessPage` |
| `/learn/public-business` | **none** | `PublicBusinessPage` |

Note the pattern: **`PublicEducationPage` and `PublicBusinessPage` each serve two routes** — one
authenticated, one not. The components are named "public" because they need no session, not because they are
only public.

Three routes render without a session, which puts this module alongside [events](../events/) and
[legal](../legal/) as the app's public surface.

## 2. Components

| Component | Role |
|---|---|
| `PageWrapper` | shell and layout |
| `VideoHero` | the lead video |
| `GalleryRow` | a strip of video cards |
| `VideoCard` | one video |
| `VideoModal` | plays a video in an overlay |
| `FaqSection` | the FAQ |

Each with its own CSS file. Note `pages/training-schedule.css` also lives here — a stylesheet for a
different module's page.

## 3. States

| State | What the user sees |
|---|---|
| Default | hero, galleries, FAQ |
| Video open | the modal |
| FAQ item expanded | its answer |
| Video unavailable | a broken player — nothing validates URLs |

No loading or error states; nothing is fetched.

## 4. Interaction rules

- **The same component serves the public and authenticated routes.** Do not fork one to add
  signed-in-only content — that would create two pages to keep in step, which is exactly what the shared
  component avoids.
- **Videos open in the modal**, not by navigation.

## 5. Responsive and print behaviour

Per-component CSS plus Tailwind. These are public marketing pages, so phone rendering matters most. No print
styles.

## 6. Accessibility

The FAQ is an expand/collapse list and the modal is an overlay; both are standard. No systematic pass has
been made, and the video modal's focus handling is hand-rolled rather than using the shared `Modal`.

## 7. Styling and theming

Six component-scoped CSS files. **Content is in the components** — video URLs, copy and FAQ entries — so any
change is a release. This module is not on [admin](../admin/)'s content engine.

One oddity worth knowing: `pages/training-schedule.css` sits in this module and belongs to
[training-schedule](../training-schedule/). It is a **byte-identical, unimported duplicate** — 18,008 bytes,
the same as `training-schedule/pages/training-schedule.css`, and **nothing imports this copy** (verified by
grep; the page imports its own).

It is therefore dead code that looks live. Editing it changes nothing. It should be deleted — see
[training-schedule UI §7](../training-schedule/UI.md#7-styling-and-theming).
