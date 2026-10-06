# Admin — Architecture

| | |
|---|---|
| **Module** | `admin` |
| **Source** | `src/features/admin/` |
| **Routes** | 12 under `/admin/*` |
| **Backend module** | six apps |
| **API prefix** | six |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

There is **no module-level layering**, because there is no module. Each sub-feature is its own
small feature with its own subset of the standard shape:

| Sub-feature | Has | Notes |
|---|---|---|
| `access-control` | pages, components, services ×2, types, utils | the largest; two services |
| `content-pages` | components, types, utils | **no pages, no service** — an engine |
| `wb-pipeline` | pages, components, hooks, services, types | uses React Query |
| `products` | pages, components, hooks, services, types | uses React Query |
| `misalignments` | pages, components, hooks, services, types | uses React Query |
| `invite-agents` | pages, services | |
| `home-content` | pages, services | |
| `training-center` | pages, services | consumes the engine |
| `file-vault` | pages, services | consumes the engine |
| `mission-ring-proof` | one page + index | lazy-exported |
| `promotion` | pages, components, hooks, services, types | uses React Query; reorder is optimistic. Imports `DASHBOARD_QUERY_KEY` and `getEmbedVideoUrl` from `src/features/promotion/` |

**Three sub-features use React Query and six do not.** `products`, `misalignments` and
`wb-pipeline` — the three with a `hooks/` directory and a `my-access` endpoint — follow the
platform convention. The rest load with `useEffect` + `useState`. This is accretion, not a
scheme; see [PHASES.md](PHASES.md#3-decision-log).

## 2. Component map

```
/admin/*  — twelve routes, five different gates

AdminRoute (isAdmin)                      per-capability guards            no guard
├── /admin/functions                      ├── /admin/products             ├── /admin/invite-agents
├── /admin/user-permissions               │    ProductsRoute              └── /admin/mission-ring-proof
├── /admin/level-permissions              ├── /admin/reporting-pipeline
├── /admin/file-vault ─────┐              │    WbPipelineRoute
├── /admin/training-center ┤              └── /admin/data-integrity/…
└── /admin/home-content    │                   MisalignmentsRoute
                           │
                  ContentPageAdminShell<TSection, TItem>
                  ├── ContentSectionFormModal
                  ├── ContentItemFormModal
                  │    ├── SchemaField          (per ContentFieldSchema)
                  │    ├── DeliveryModeSelector
                  │    └── StagedFilePicker
                  └── RoleAccessPicker
```

### The content-administration engine

`content-pages/` is the one piece of shared architecture. It exports a generic shell and an
interface; a consumer supplies the API implementation and a field schema.

```ts
// content-pages/types.ts:115
type ContentAdminApi<TSection, TItem> = {
  listSections, createSection, updateSection, deleteSection,
  updateSectionRoles, reorderSections,
  createItem, updateItem, deleteItem, updateItemRoles, reorderItems,
  uploadItemFile,          // (id, file, 'file' | 'thumbnail')
}
```

Consumers: `file-vault/pages/admin-file-vault-page.tsx:82` and
`training-center/pages/admin-training-center-page.tsx:134`. Each builds the object with
`useMemo` and hands it to `<ContentPageAdminShell<…>>`.

**`home-content` does not use the engine.** It has its own page and service, because the home
page is a fixed set of named slots (hero, carousels, video) rather than an ordered list of
sections and items. The engine's model would not fit it.

Note the shape of `uploadItemFile`: it takes an **id**, so a file can only be uploaded after the
item exists. That is what `StagedFilePicker` is for — it holds the chosen file through the
create call and uploads afterwards. Any new consumer must do the same or lose the file.

## 3. Primary flows

### 3.1 Granting a capability

1. `user-permissions-page` lists permissions from `/api/authz/permissions/` and grants from
   `/api/authz/user-permissions/`.
2. `PermissionCascader` presents them grouped by prefix, so `wbreporting:read` and
   `wbreporting:manage` sit together.
3. `UserPicker` resolves the target user.
4. A grant is created or deleted.

This is the console every gated feature in the app depends on. `homev2:read`, `gms:author`,
`products:read` and the rest are granted here and nowhere else, which is what makes a rollout a
console action rather than a deploy ([platform §6](../platform/ARCHITECTURE.md#6-permissions-and-scoping)).

### 3.2 Granting at a level

1. `level-permissions-page` loads levels — via **`team`'s** `fetchLevels`, not its own service.
2. Picking a level lists its grants from `/api/authz/level-permissions/`.
3. A grant applies to everyone at that level.

### 3.3 Administering a content page

1. The admin page builds a `ContentAdminApi` for its content type.
2. `ContentPageAdminShell` renders sections and items, with drag-ordering
   (`@dnd-kit`) calling `reorderSections` / `reorderItems`.
3. Creating an item opens `ContentItemFormModal`, which renders one `SchemaField` per declared
   `ContentFieldSchema` entry.
4. `DeliveryModeSelector` defaults from `inferDeliveryMode(file)`; `isPdfLike` and
   `guessResourceTypeFromFile` do the guessing.
5. `StagedFilePicker` holds the file; after the item is created, `uploadItemFile` sends it.
6. `RoleAccessPicker` sets which roles may see the section or item.

### 3.4 Running the reporting pipeline

1. `wb-pipeline` reads `usePipelineAccess()` for `can_view` / `can_manage`.
2. The page shows recent runs and their state.
3. A recalculate or rebuild submits asynchronously and returns a run id; the page polls.

Repeated clicks while the shared lock is held return the already-running state rather than
creating overlapping work — the lock is the backend's.

## 4. Server state and caching

Split, by sub-feature:

| Sub-feature | Mechanism | Keys |
|---|---|---|
| `products` | React Query | `useProductsAccess` and siblings |
| `misalignments` | React Query | `useMisalignmentsAccess` and siblings |
| `wb-pipeline` | React Query | `usePipelineAccess` and siblings |
| `promotion` | React Query | `['promotion-admin', 'tracks']` — the whole tree. Every save also invalidates the learner's `promotion-dashboard` and `promotion-team` keys |
| everything else | `useEffect` + `useState` | none |

The three `my-access` hooks are the ones with long `staleTime`, because
`use-role-based-menu.ts` calls all three on **every authenticated page load** to decide menu
entries. They are not admin-page state; they are app-wide navigation state that happens to live
here.

The six `useEffect` sub-features each reload their own lists after their own mutations. There is
no cache between them, which is harmless — no two of them show the same data.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Tab (`catalog` / `assign` on Functions) | the page | `useState` |
| Selected level | `level-permissions-page` | `useState` |
| Modal open + target | each page | `useState` |
| Staged file | `StagedFilePicker` | `useState`, until upload |
| Section/item order | the shell, optimistically | `useState` + a reorder call |

No sub-feature reads or writes the query string. Every screen starts from its default state.

## 6. Permissions and gating

**Five different gating mechanisms across twelve routes** — this is the module's most confusing
property and it is real, not a documentation artefact:

| Mechanism | Routes | Gate |
|---|---|---|
| `AdminRoute` | functions, user-permissions, level-permissions, file-vault, training-center, home-content, promotion | the **cached `isAdmin` flag** from the session |
| `ProductsRoute` | products | `products:read` at runtime |
| `WbPipelineRoute` | reporting-pipeline | `wbreporting:read` / `:manage` at runtime |
| `MisalignmentsRoute` | both data-integrity screens | a per-user grant at runtime |
| **none** | invite-agents, mission-ring-proof | nothing on the client |

The six `AdminRoute` screens are gated on a **client-cached** boolean
(`localStorage['isAdmin']`, written at login — see
[auth §6](../auth/ARCHITECTURE.md#6-permissions-and-gating)), so the grant is stale until the
user signs out and back in, and the value is client-modifiable. The four newer screens ask the
backend at runtime instead.

Both are safe, for one reason only: **the backend enforces every permission on every request,
independently.** A modified `isAdmin` opens a screen whose every call then fails. But the
inconsistency is a real hazard for a reader, and the two unguarded routes are the sharpest
version of it — `/admin/invite-agents` renders for any authenticated user and relies entirely on
the API refusing them.

## 7. Integration points

- **Six backend apps** ([API.md](API.md)). No `admin` app exists.
- **`team`** — `level-permissions-page` imports `fetchLevels` from
  `features/team/prospect/services/prospect-service`. A direct cross-feature service import
  that bypasses `team`'s public surface; noted in §8.
- **`src/hooks/use-role-based-menu.ts`** — imports three `my-access` hooks from here. `admin` is
  therefore a dependency of the shell's navigation, not just a leaf.
- **`content`** — the three content sub-features, plus the reader-facing pages in
  `file-vault`, `training-center` and `home`.
- **The reader-facing modules** — this module writes the content they display. A schema change
  here changes what they render.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| A file is uploaded only after its item exists | `uploadItemFile(id, …)` plus `StagedFilePicker` | a chosen file silently lost on create |
| Reorder sends the full id list | `reorderSections` / `reorderItems` take `ids[]` | an order that partially applies |
| Role access is set per section **and** per item | two separate calls | an item visible inside a hidden section, or the reverse |
| A capability is granted here and nowhere else | convention | a feature gated on a permission nothing can grant |
| Every screen's gate is re-checked server-side | the backend | nothing — this is what makes five inconsistent gates survivable |

**The `isAdmin` staleness.** Six screens gate on a flag cached at login. Granting someone admin
does not open them until the next sign-in. This surprises people and the fix belongs in `auth`,
not here.

**The cross-feature import.** `level-permissions-page` reaching into
`features/team/prospect/services/` means a refactor of `team`'s prospect service can break an
access-control screen with no signal from either module's public surface. Levels are reference
data and arguably belong in `core/constants` or a shared service; recorded in
[PHASES.md §5](PHASES.md#5-outstanding).

**Ten sub-features, one directory.** Nothing enforces the separation. A future sub-feature could
import another's service and nothing would complain. The only real boundary is that each has its
own service and its own backend app.
