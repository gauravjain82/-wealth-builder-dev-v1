# Admin — API

| | |
|---|---|
| **Module** | `admin` |
| **Source** | `src/features/admin/*/services/` |
| **Routes** | 12 under `/admin/*` |
| **Backend module** | `accounts`, `authz`, `audit`, `content`, `misalignments`, `tracker` |
| **API prefix** | six |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed. **There is no `admin` backend app.** Each sub-feature
> talks to a different one, and that app's own docs are the authority.

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)). Ten services, one
per sub-feature, each re-declaring its own helpers — except the three content services, which
import `API_BASE_URL` and `getAuthHeaders` from
`src/shared/services/content-page-service.ts`. That shared module is the one place the app's
would-be common HTTP client is actually used.

File uploads go as `FormData` and must not set `Content-Type`.

## 2. Endpoints consumed

### `authz` — access control

| Method | Path | Sub-feature |
|---|---|---|
| GET | `/api/authz/permissions/` | access-control — the catalog |
| GET · POST · DELETE | `/api/authz/user-permissions/` | access-control — per-user grants |
| GET · POST · DELETE | `/api/authz/level-permissions/` | access-control — per-level grants |

### `accounts` — users, functions, invitations

| Method | Path | Sub-feature |
|---|---|---|
| GET | `/api/accounts/users/` | user pickers |
| GET · POST · DELETE | `/api/accounts/functions/` | access-control |
| GET · DELETE | `/api/accounts/user-functions/` | access-control |
| GET · POST | `/api/accounts/invitations/` | invite-agents |
| GET · POST | `/api/accounts/agency-code-assignments/` | invite-agents |

### `content` — the three content sub-features

| Method | Path | Sub-feature |
|---|---|---|
| — | `/api/content/admin/home-page` | home-content |
| — | `/api/content/admin/file-vault` | file-vault |
| — | `/api/content/admin/training-center` | training-center |

Each admin prefix carries the full section/item surface the `ContentAdminApi` interface
declares: list, create, update, delete and reorder for sections and items, role updates for
both, and a file upload per item. See `content-pages/types.ts:115` for the exact shape.

The **reader-facing** counterparts are `/api/content/home-page/`,
`/api/content/file-vault/`, `/api/content/training-center/` and their `items/` and
`progress/` sub-paths, consumed by `home`, `file-vault` and `training-center`.

### `misalignments`

| Method | Path | Sub-feature |
|---|---|---|
| GET | `/api/misalignments/my-access/` | gate for the menu and the route |
| GET | `/api/misalignments/leaders/` | leader misalignments |
| GET | `/api/misalignments/policies/` | policy misalignments |

Read-only. Diagnosis, not repair.

### `tracker` — products

| Method | Path | Sub-feature |
|---|---|---|
| GET | `/api/tracker/products/my-access/` | gate |
| GET · POST · PATCH · DELETE | `/api/tracker/products/` | the catalog |
| GET · POST | `/api/tracker/products/companies/` | companies |

Products live under `tracker`, not a `products` app — worth knowing before searching the backend.

### `wbreporting` — pipeline

| Method | Path | Sub-feature |
|---|---|---|
| GET | `/api/wbreporting/my-access/` | gate. **The same endpoint `leaderboards` and `contests` use** |
| GET | `/api/wbreporting/pipeline/runs/` | run history |
| POST | `/api/wbreporting/pipeline/recalculate-daily/` | async recalculation |
| POST | `/api/wbreporting/pipeline/rebuild-monthly/` | async rebuild |

### `audit`

| Method | Path | Sub-feature |
|---|---|---|
| GET | `/api/audit/` | change history surfaced alongside admin screens |

## 3. Payload types

Per sub-feature, in `<sub-feature>/types.ts` — there is no shared admin type module. The ones
worth knowing:

| Type | Where | Note |
|---|---|---|
| `PermissionItem`, `LevelPermissionItem` | `access-control/types.ts` | the capability catalog and a level grant |
| `FunctionItem`, `UserFunctionItem` | " | functions are **not** permissions |
| `UserSearchResult` | " | what `UserPicker` resolves |
| `ContentAdminApi<TSection, TItem>` | `content-pages/types.ts:115` | the engine's contract |
| `ContentSectionAdmin`, `ContentItemAdmin` | " | the base shapes consumers extend |
| `ContentFieldSchema`, `FieldValue` | " | what drives `SchemaField` |
| `DeliveryMode` | " | inline / download / link |
| `ContentUploadResult` | " | what `uploadItemFile` returns |

`ContentSectionAdmin` and `ContentItemAdmin` are extended per consumer —
`FileVaultSectionAdmin`, `TrainingCenterItemAdmin` and so on — which is how the generic shell
stays type-safe over different content types.

## 4. Query parameters

No shared convention. Search endpoints take `q`; list endpoints take the filters their page
offers. `interest`-style ordering and pagination are per sub-feature.

## 5. Error codes and handling

No typed error classes anywhere in this module. Failures surface as toasts carrying the
backend's message.

| Situation | Status | Client behaviour |
|---|---|---|
| Missing capability on a guarded route | 403 | the guard already redirected; a direct call fails |
| **Missing permission on an unguarded route** | 403 | `/admin/invite-agents` and `/admin/mission-ring-proof` render, then every call fails |
| Stale `isAdmin` | 403 | the six `AdminRoute` screens open and then fail. Sign out and back in |
| Upload rejected | 4xx | surfaced on the form; the item still exists without its file |
| Pipeline already running | 200 | the running state, not an error — the backend holds a shared lock |
| Deleting a permission in use | 4xx | the backend refuses; no client-side dependency check |

The second and third rows are the module's characteristic failure shape: a screen that opens and
then cannot do anything. It is a consequence of the five-gate inconsistency in
[ARCHITECTURE.md §6](ARCHITECTURE.md#6-permissions-and-gating), not of a broken backend.

## 6. Backend ownership

The six apps own:

- **Every permission decision**, on every request. This is what makes the client's inconsistent
  gating survivable.
- **The permission catalog.** The client renders what `/api/authz/permissions/` lists; it has no
  hard-coded capability list.
- **Content storage, ordering and role filtering.** The reader-facing endpoints apply role access
  server-side, so hiding a section here genuinely hides it.
- **Misalignment detection.** The client displays findings and computes none of them.
- **The pipeline lock and run history.** Repeat submissions are collapsed server-side.
- **Agency-code assignment**, and its consequences throughout reporting.
- **Referential safety on delete** — whether a permission or section may be removed.

The client owns which controls to offer, staging a file until its item exists, sending complete
reorder lists, and grouping the capability catalog for a human to read.
