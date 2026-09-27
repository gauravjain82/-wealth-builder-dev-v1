# Systematic Tools — UI

| | |
|---|---|
| **Module** | `systematic-tools` |
| **Source** | `src/features/systematic-tools/` |
| **Routes** | `/systematic-tools` |
| **Backend module** | none |
| **API prefix** | none |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Route | Guard | Component |
|---|---|---|
| `/systematic-tools` | `ProtectedRoute` only | `TenSystematicToolsPage` |

## 2. Screens and components

| Component | Role |
|---|---|
| `TenSystematicToolsPage` | the menu, the gating, and the admin edit mode |
| `SecureSlidePlayer` | slide content |
| `FullscreenViewer` | fullscreen display |
| `PdfAnnotator` | annotate a PDF |
| `BusinessShowerFlyerModal` | a preset flyer generator |
| `CustomFlyerModal` | a custom flyer generator |

### Access gating — client-side, from the session

This is the module's real logic, and it is **entirely client-side**:

1. `resolvePlan()` reads roles from `localStorage['wb.roles']`, falling back to `authUser` (`:45`, `:55`).
2. `normalizePlanFromRole()` maps a role to a `Plan`, defaulting to `Plan.NewAgent` (`:37`).
3. An `accessMap: Record<Plan, number[]>` (`:165`) lists which section indices each plan may open.
4. Admin is `Plan.Admin` **or** `localStorage['isAdmin'] === 'true'` (`:78`).

**So the gate is the session cache, and nothing else.** There is no server check, because there is no
server call — the content is in the bundle. A user who edits `localStorage` sees every section, and since the
slides ship in the JavaScript, that is a display gate rather than a security boundary. Worth stating plainly:
this content is **not confidential**, and nothing here can make it so.

That is a different posture from every other gated feature in the app, where the backend re-checks each
request ([platform §6](../platform/ARCHITECTURE.md#6-permissions-and-scoping)).

### Admin edit mode

Admins can reorder or edit the menu, and changes persist to `localStorage` — per browser, not shared. An
admin's rearrangement is invisible to everyone else and lost when they clear site data.

## 3. States

| State | What the user sees |
|---|---|
| Gated section | locked, per the access map |
| Plan unresolved | defaults to `Plan.NewAgent` — the **most** restricted |
| Admin | edit mode available |
| Menu edited | the local arrangement, for this browser only |
| Viewer open | slides, PDF or video |
| Annotating | the PDF annotator |
| Flyer modal | a generated flyer |

## 4. Interaction rules

- **Default to the most restricted plan** when the role cannot be resolved. `Plan.NewAgent` is the safe
  default and the code does this.
- **Treat the gate as presentation, not protection.** The content is in the bundle.
- **Admin menu edits are local.** Do not present them as publishing.

## 5. Responsive and print behaviour

`components/ten-tools.css` and `custom-flyer-modal.css`. Flyers are generated for printing via `jspdf`, which
is this module's real print path.

## 6. Accessibility

The viewers and the annotator are pointer-driven surfaces with no documented keyboard path. No pass has been
made.

## 7. Styling and theming

Two stylesheets. Content and the menu are **constants in the page**, so a content change is a release, and
the module is not on [admin](../admin/)'s content engine.

## 8. Known lint errors

**This module holds 2 of the repository's 7 lint errors** — the only other place besides
[team](../team/OPERATIONS.md#4-tests-and-checks):

| File | Line | Rule |
|---|---|---|
| `components/pdf-annotator/index.tsx` | 619 | unused `eslint-disable` directive |
| `pages/ten-systematic-tools-page.tsx` | 444 | `no-empty` |

Both are pre-existing. Fixing these two plus `team`'s five would take the repository from 7 errors to 0 and
make `npm run lint` usable as a gate for the first time
([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)).
