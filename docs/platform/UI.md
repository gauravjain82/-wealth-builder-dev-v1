# Platform — UI

| | |
|---|---|
| **Module** | `platform` |
| **Source** | `src/shared/`, `src/router/`, `src/config/menu.ts` |
| **Routes** | mounts all of them |
| **Backend module** | `accounts` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 (§6 re-read at `743afe1`, 2026-09-30, parity phase 21 audit) |

## 1. Routes and entry points

98 route entries in one file, `src/router/index.tsx`. Three groups:

### Public (no session)

| Route | Component | Note |
|---|---|---|
| `/` | `RootRedirect` | sends a signed-in user to `/home`, otherwise to `/login` |
| `/login`, `/signup`, `/reset-password` | auth pages | wrapped in `PublicRoute` |
| `/help-needed` | helpdesk | reachable without a session by design |
| `/privacy-policy`, `/terms-and-conditions` | legal | |
| `/public-insight-center`, `/learn/public-business`, `/learn/public-education` | public content | |
| `/team/builders/daily-six/:agencyCode` | Builder AI daily six | shareable link |
| `/add-goals` | goals form | |
| `/event/:shortcut`, `/event/:shortcut/checkout`, `/event/:shortcut/transfer`, `/event/ticket/:qrToken` | public event surfaces | ticket buying and transfer |
| `/bpm/pass/:token` | BPM guest pass | |

### Authenticated

Everything under `ProtectedRoute` → `MainLayout`, rendering into its `<Outlet>`. Grouped by
module in the [index](../README.md). Eight of them carry an additional capability guard.

### Fallback

`*` → `<Navigate to="/" replace />`. There is **no 404 page**: an unknown path silently
becomes the root redirect.

### Lazy loading

Every route component is wrapped in `lazyLoad`, so each module is its own chunk and a route
nobody visits is never downloaded. `router/route-error-boundary.tsx` catches a failed chunk
load or a render error and keeps the shell alive.

## 2. Screens

### 2.1 `MainLayout`

The frame every authenticated screen renders inside — `shared/layouts/main-layout.tsx:13`.

| Element | Source | Notes |
|---|---|---|
| `Header` | `shared/layouts/header.tsx` | identity, theme toggle |
| `Sidebar` | `shared/layouts/sidebar.tsx` | navigation from `useRoleBasedMenu` |
| `<Outlet>` | the routed module | inside `.main-layout__main-inner` |
| `ExpandableChat` | `features/ai/components/` | mounted on every authenticated page |

### 2.2 `AuthLayout`

`shared/layouts/auth-layout.tsx` — the frame for login, signup and password reset. No
sidebar, no chat.

### 2.3 Navigation

`src/config/menu.ts` (751 lines) declares items as `MenuItem` — label, icon, path, optional
children, optional `roles`. `getMenuForUser` filters by plan and role;
`src/hooks/use-role-based-menu.ts` then injects capability-gated groups. Icons are emoji
string literals in the config, mapped to components by
`shared/layouts/menu-icon-map.tsx` where a component is wanted.

A route added to `router/index.tsx` without a matching `menu.ts` entry is reachable but
invisible. Both edits belong in the same commit.

## 3. States

The shell's own states. Module states belong in that module's `UI.md`.

| State | Trigger | What the user sees |
|---|---|---|
| Loading | `useAuth` resolving the stored session | full-screen centred "Loading..." (`router/protected-route.tsx:16`) |
| Loading (gated) | a `my-access` query in flight | same full-screen loader from the capability guard |
| Denied | a capability guard resolves false, or errors | silent `<Navigate to="/home" replace />` — no message |
| Unauthenticated | no session on a protected route | redirect to `/login`, origin kept in `location.state.from` |
| Chunk failure | a lazy import rejects | `route-error-boundary.tsx` renders inside the shell |
| Unknown route | any unmatched path | redirect to `/`, no 404 |

Two of these are known rough edges: a denial redirects with no explanation, and a full-screen
loader on a guard means a gated page flashes a blank frame before it resolves. Both are
recorded in [PHASES.md §5](PHASES.md#5-outstanding).

## 4. Interaction rules

- **A guard renders nothing until it knows.** No optimistic render, no flash of gated
  content. Loader → content or redirect.
- **The redirect target for a denial is `/home`, always.** Not back, not the root — a
  landing page the user is certain to be allowed.
- **`location.state.from` survives a login redirect** so the user returns where they aimed
  (`protected-route.tsx:22`).
- **Toasts are global, via the Zustand `toast` slice.** A module dispatches; the shell
  renders. Modules do not mount their own toast containers.

## 5. Responsive and print behaviour

The shell is responsive through Tailwind utilities plus three hand-written stylesheets:
`main-layout.css`, `sidebar.css`, `header.css`. The sidebar collapses on narrow widths.

There is **no shell-level print stylesheet.** The one print rule set in the codebase is
module-scoped — `src/features/leaderboards/leaderboards.css`, for the Full Report. A module
that needs print handles it under its own class prefix.

## 6. Accessibility

What the shell provides: semantic `<main>` and `<nav>` landmarks, `aria-label` on view
switchers, and Radix's tooltip (`@radix-ui/react-tooltip`). `@radix-ui/react-dialog` is a
dependency, but no file imports it: the shared modals are the hand-rolled `Modal` below.

What it does not: there is no automated accessibility check in the toolchain, and the
full-screen loaders are unannounced. Treat Radix-backed components as the accessible path
and a hand-rolled overlay as needing its own focus management.

**The shared `Modal`** (`shared/components/ui/modal/index.tsx`) is not Radix: it is a
`createPortal` to `document.body`. Since contests parity phase 20 it is `role="dialog"` with
`aria-modal` and `aria-labelledby` its title, moves focus into the panel on open (unless a child
already took it, such as an `autoFocus` input), keeps Tab inside the top open modal, and returns
focus to where it was on close. Before that it did none of these. **Escape and a backdrop click
close it only with `dismissible`**, off by default so a form is not lost to a stray key; with two
open, only the top one answers (decision C30, `docs/contests/PHASES.md`). It is widely used: 61
feature files render it directly, and the two shared confirmation dialogs built on it
(`ui/confirmation-dialog.tsx` `ConfirmationDialog`, `ConfirmDialog.tsx`) are used by 16, six of
which do not render `Modal` themselves — 67 feature files in all,
across bpm, team, matchup, events, admin, settings, builder-ai, leaderboards, contests and the
training schedule. Only the four contest dialogs pass `dismissible`; the dialog semantics and focus
handling apply to all of them. Two were driven with the keyboard in parity phase 20 (the contest
card's Filters and the training schedule's meeting dialog); the rest were not.

**Known issue — Tab inside a portalled popup** (keyboard only, not yet fixed). The Tab trap treats
focus outside the panel as escaped and pulls it back to the modal's first control
(`modal/index.tsx:88-90`). A popup that portals to `document.body` from inside a `Modal` is outside
the panel, so pressing Tab in it jumps to the top of the modal: the shared `DatePicker`
(`ui/date-picker/index.tsx:60`; e.g. `bpm/components/bpm-form-modal.tsx`), and by the same code
path the `UserAutocompleteDropdown` search (`user-autocomplete-dropdown/index.tsx:289`) in the
contest card's Filters. Mouse use is unaffected. The fix belongs in `Modal`, treating a portalled
child as inside. Tracked in `docs/contests/PHASES.md` §5.

## 7. Styling and theming

- **Tailwind CSS** is the default (`tailwind.config.js`), with `clsx` +
  `tailwind-merge` for conditional classes and `class-variance-authority` for component
  variants.
- **Shared components** live in `shared/components/ui/` — 19 groups: button, card, input,
  select, combobox, modal, form, date-picker, phone-input, tooltip, typography and the rest.
  Prefer one of these over a new primitive.
- **Component CSS files** are used where Tailwind is awkward (layout, print, container
  queries). Each is scoped under a module prefix — `wb-lb-` for leaderboards — so a module
  stylesheet cannot leak.
- **Theme** is a class on `document.documentElement` plus `data-theme` and
  `style.colorScheme`, set by `src/hooks/use-theme.ts` from the Zustand `ui` slice. Three
  values: `light`, `dark`, `system`; `system` subscribes to
  `prefers-color-scheme` and follows changes live.

A module must not define a competing global theme. Scope styles to the feature root and use
the tokens the shell sets.
