# Admin — UI

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

## 1. Routes and entry points

| Route | Guard | Component | Sub-feature |
|---|---|---|---|
| `/admin/functions` | `AdminRoute` | `FunctionsPage` | access-control |
| `/admin/user-permissions` | `AdminRoute` | `UserPermissionsPage` | access-control |
| `/admin/level-permissions` | `AdminRoute` | `LevelPermissionsPage` | access-control |
| `/admin/file-vault` | `AdminRoute` | `AdminFileVaultPage` | file-vault |
| `/admin/training-center` | `AdminRoute` | `AdminTrainingCenterPage` | training-center |
| `/admin/home-content` | `AdminRoute` | `AdminHomeContentPage` | home-content |
| `/admin/products` | `ProductsRoute` | `ProductsListPage` | products |
| `/admin/reporting-pipeline` | `WbPipelineRoute` | `WbPipelinePage` | wb-pipeline |
| `/admin/data-integrity/leader-misalignments` | `MisalignmentsRoute` | `LeaderMisalignmentsPage` | misalignments |
| `/admin/data-integrity/policy-misalignments` | `MisalignmentsRoute` | `PolicyMisalignmentsPage` | misalignments |
| `/admin/invite-agents` | **none** | `InviteAgentsPage` | invite-agents |
| `/admin/mission-ring-proof` | **none** | `AdminMissionRingProofPage` | mission-ring-proof |

Three further `/admin/*` routes belong to other modules: `/admin/contest-settings`
(`docs/contests/`), `/admin/guidance` (`docs/gms/`), `/admin/helpdesk` (`docs/helpdesk/`).

`content-pages` has no route — it is the engine the File Vault and Training Center screens
render through.

## 2. Screens

### 2.1 Content administration — the shared shell

`ContentPageAdminShell` gives File Vault and Training Center the same screen:

| Element | Behaviour |
|---|---|
| Section list | drag-orderable (`@dnd-kit`), each with edit / delete / role access |
| Item list per section | same, plus the file and thumbnail |
| `ContentSectionFormModal` | title, subtitle, icon, activity |
| `ContentItemFormModal` | one `SchemaField` per declared `ContentFieldSchema` entry |
| `DeliveryModeSelector` | inline / download / link, pre-selected from the file |
| `StagedFilePicker` | holds the chosen file and thumbnail until the item exists |
| `RoleAccessPicker` | which roles may see this section or item |

Because the form is schema-driven, adding a field to a content type is a schema entry rather
than a new form. That is the whole reason the engine exists.

### 2.2 Home content — `home-content/pages/`

Its own screen, not the shell: the home page is a fixed set of named slots — hero background,
trailer video, register URL, contest and recognition carousels — rather than an ordered list of
sections. The engine's model does not fit, so it was not used.

### 2.3 Access control — three screens

- **Functions** — two tabs: `catalog` (the function list, CRUD) and `assign` (assign a function
  to a user via `UserPicker`).
- **User permissions** — pick a user, then grant or revoke permissions through
  `PermissionCascader`, which groups by prefix so `wbreporting:read` and `wbreporting:manage`
  appear together.
- **Level permissions** — pick a level, then grant permissions to everyone at it.

These three are the access console. Every runtime capability in the app is granted here.

### 2.4 Products — `products/pages/products-list-page.tsx`

The product catalog with company association. Recent commit history shows the company selector
moving to a `Combobox` and company management being added inline, so a product can be created
without leaving for a separate company screen.

### 2.5 Data integrity — two screens

**Leader misalignments** and **policy misalignments**: lists of records whose relationships
contradict themselves. Read-only diagnosis — this module reports inconsistency, it does not
repair it.

### 2.6 Reporting pipeline — `wb-pipeline/pages/`

Recent pipeline runs with state and heartbeat, plus recalculate-daily and rebuild-monthly
actions. Both submit asynchronously and return a run id.

### 2.7 Invite agents — `invite-agents/pages/`

Invite a new agent and assign an agency code. The agency code matters more than it looks: it is
what ties the person into every reporting table, and a member without one contributes nothing —
see [leaderboards](../leaderboards/README.md#4-domain-vocabulary) on `uncoded_member_count`.

### 2.8 Mission ring proof — `mission-ring-proof/`

One page reviewing submitted proof. The smallest sub-feature at 187 lines.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Loading | a list in flight | per-page loading, from `useState` in six sub-features and React Query in three |
| Empty | no sections, no grants, no misalignments | an empty list. An empty misalignments list is the **good** outcome |
| Denied | a capability guard resolves false | redirect to `/home`, silently ([platform UI §3](../platform/UI.md#3-states)) |
| Not admin | `isAdmin` false on an `AdminRoute` screen | the same silent redirect |
| Saving | a mutation pending | disabled controls |
| Outcome | any mutation | a toast from `useToastStore` |
| File staged | a file chosen, item not yet created | the filename shown; upload happens after create |
| Reordering | a drag in progress | optimistic order, then a reorder call |
| Pipeline running | a run in flight | run state and heartbeat; repeat clicks return the running state |

## 4. Interaction rules

- **Stage the file, upload after create.** `uploadItemFile` needs an item id. A new engine
  consumer that uploads on selection loses the file.
- **Reorder sends the whole id list**, not a moved-item delta.
- **Role access is set separately on sections and items.** Neither implies the other.
- **Confirm every destructive action.** `ConfirmationDialog` on delete, throughout.
- **Report every mutation with a toast.** These screens have no other feedback channel.
- **Group permissions by prefix.** `PermissionCascader` exists because a flat list of capability
  strings is unreadable at this count.
- **Never repair a misalignment from the UI.** The data-integrity screens diagnose only.

## 5. Responsive and print behaviour

Tailwind utilities; no module stylesheet. These are desktop administrative screens — wide
tables, drag-ordering and multi-column forms. They are usable but not designed for a phone, and
drag-ordering in particular is a mouse interaction with no touch or keyboard alternative.

No print styles. *Not applicable.*

## 6. Accessibility

Shared primitives supply labelled inputs and Radix-backed dialogs. `ConfirmationDialog` is used
consistently for destructive actions.

Two real gaps:

- **Drag-ordering has no keyboard path.** `@dnd-kit` supports keyboard sensors; they are not
  configured, so section and item order cannot be changed without a pointer.
- **A denial is silent.** An admin who follows a link to a screen they have lost access to gets
  a redirect with no explanation.

## 7. Styling and theming

No stylesheet. Everything is Tailwind plus `shared/components/ui`. The content engine's forms
are built from primitives rather than bespoke markup, which is what lets a schema-driven form
look like a hand-written one.
