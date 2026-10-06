# Admin — Overview

| | |
|---|---|
| **Module** | `admin` |
| **Source** | `src/features/admin/` |
| **Routes** | 13 under `/admin/*` |
| **Backend module** | `accounts`, `authz`, `audit`, `content`, `misalignments`, `promotion`, `tracker` |
| **API prefix** | six — see [API.md](API.md) |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

`admin` is not one feature. It is **eleven independent administrative sub-features** that share a
directory, a route prefix and nothing else. Each answers a different operational question — who
may do what, what content appears on which page, which products exist, where the data has gone
wrong — and each talks to a different backend app.

Read that literally, because it is the single most important thing about this module: there is
no `admin` domain, no shared state, and no `admin` backend app. Treating it as one feature is
the mistake that makes it confusing. Treat it as a directory of neighbours.

The one genuinely shared thing is the **content-administration engine**: a generic
`ContentPageAdminShell<TSection, TItem>` plus a `ContentAdminApi` interface that File Vault and
Training Center each implement for their own content types. That is the "content management"
half of this module, and it is the only place where two sub-features share code rather than a
parent folder.

## 2. Scope

**In scope** — eleven sub-features:

| Sub-feature | Answers | LOC |
|---|---|---|
| `access-control` | Who holds which permission, at user and at level? What functions exist? | 1827 |
| `content-pages` | *(engine, no route)* How is any content page administered? | 1436 |
| `wb-pipeline` | Is the reporting pipeline healthy? Recalculate it. | 977 |
| `products` | What products exist, from which companies? | 975 |
| `misalignments` | Where is the hierarchy or policy data inconsistent? | 913 |
| `invite-agents` | Invite new agents and assign agency codes. | 853 |
| `home-content` | What appears on the home page? | 386 |
| `training-center` | Training Center sections and items. | 344 |
| `file-vault` | File Vault sections and items. | 290 |
| `mission-ring-proof` | Review submitted mission-ring proof. | 187 |
| `promotion` | Which skills, videos and quizzes make up each promotion track, in what order? | 1395 |

**Explicitly out of scope** — three screens live under `/admin/*` but belong to other modules,
and are documented there:
- `/admin/contest-settings` → `docs/contests/`
- `/admin/guidance` → `docs/gms/`
- `/admin/helpdesk` → `docs/helpdesk/`

Also out of scope: the *reader-facing* File Vault, Training Center and home pages. This module
administers their content; `docs/file-vault/`, `docs/training-center/` and `docs/home/` cover
what the reader sees.

## 3. At a glance

| | |
|---|---|
| Routes | 13 |
| Sub-features | 11 (one is an engine with no route) |
| Pages | 11 |
| Services | 10 |
| Backend apps consumed | 7 |
| LOC (ts/tsx) | 8188 |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Permission** | A capability string like `products:read` or `wbreporting:manage`, granted per user or per level. |
| **Level** | A position in the hierarchy (Associate, MD, SMD…). Permissions granted at a level apply to everyone at it. |
| **Function** | A named job assignment, catalogued and assigned to users, separate from permissions. |
| **Access console** | These access-control screens, collectively. The place every capability in the app is granted — see [platform §6](../platform/ARCHITECTURE.md#6-permissions-and-scoping). |
| **Content section** | A grouping on a content page. Ordered, role-restricted. |
| **Content item** | One resource in a section — a file, a video, a link. Ordered, role-restricted. |
| **Delivery mode** | How an item is presented: inline, download, external link. Inferred from the file where possible. |
| **Staged file** | A file chosen in the form but not yet uploaded; upload happens after the item exists. |
| **Misalignment** | A data inconsistency — a leader relationship or a policy record that contradicts itself. |
| **Agency code** | The identifier tying a user to their position in reporting. Assigned at invite time. |

## 5. Dependencies

**Upstream**
- `src/shared/components/` — UI primitives, `ConfirmationDialog`, `Modal`, `Select`.
- `src/store` — toasts.
- **`src/features/team/prospect/services/prospect-service`** — `fetchLevels`, imported by
  `level-permissions-page`. A cross-feature import; see
  [ARCHITECTURE.md §7](ARCHITECTURE.md#7-integration-points).

**Downstream**
- `src/router/` — `AdminRoute` plus four per-capability guards.
- `src/hooks/use-role-based-menu.ts` — imports `useMisalignmentsAccess`, `useProductsAccess`
  and `usePipelineAccess` to decide menu entries.

**Backend** — `accounts`, `authz`, `audit`, `content`, `misalignments`, `tracker`.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before touching the content engine, or adding a sub-feature. Explains why there is no shared state. |
| [UI.md](UI.md) | Changing any of the eleven screens. |
| [API.md](API.md) | The six backend apps and which sub-feature uses each. |
| [OPERATIONS.md](OPERATIONS.md) | Granting a capability, or debugging a gated screen. |
| [PHASES.md](PHASES.md) | Before assuming this module was designed. Most of it accreted. |

## 7. Where to start reading

1. `src/router/index.tsx` — the twelve `/admin/*` routes and their guards. This is the fastest
   way to see the ten sub-features and how differently each is gated.
2. `content-pages/types.ts:115` — the `ContentAdminApi` interface. The whole content-admin
   pattern is that one type.
3. `file-vault/pages/admin-file-vault-page.tsx:82` — the shortest implementation of it.
4. `access-control/pages/user-permissions-page.tsx` — where every capability in the app is
   granted.
