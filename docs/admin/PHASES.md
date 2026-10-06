# Admin — Phase History

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

> Phases marked `~` are reconstructed from `git log -- src/features/admin`. **There was no plan
> for this module**, and it shows: ten sub-features arrived one at a time over five months, each
> solving the administrative need that had become most pressing. The `AD` decision prefix is
> assigned by this document.
>
> The one genuine piece of design here — the content-administration engine — was **extracted, not
> planned.** Phase ~4 is the story of that.

## 1. Timeline

27 commits touching `src/features/admin`, 2026-05-17 to 2026-09-27.

| Phase | Date | Status | Shipped |
|---|---|---|---|
| ~1 | 2026-05-17 | Shipped | Invite agents |
| ~2 | 2026-05-30 | Shipped | Mission ring proof |
| ~3 | 2026-08-25 | Shipped | Access control — functions and user permissions |
| ~4 | 2026-08-31 → 09-03 | Shipped | File Vault admin, then the extracted content engine, then Training Center |
| ~5 | 2026-09-14 | Shipped | Level permissions |
| ~6 | 2026-09-21 | Shipped | Data-integrity reports |
| ~7 | 2026-09-22 | Shipped | Product management; home-content reorganised |
| ~8 | 2026-09-25 | Shipped | Reporting-pipeline admin screen |
| ~9 | 2026-09-27 | Shipped | Company management inline in the product form |

## 2. Phases

### ~1 — Invite agents (2026-05-17)

**What shipped.** Agent invitation and agency-code assignment, with a resend path added
2026-07-21 and birthday validation 2026-06-17.

**Note.** No route guard was added, and none has been since.

### ~2 — Mission ring proof (2026-05-30)

**What shipped.** One page reviewing submitted proof. Still the smallest sub-feature, and also
unguarded.

### ~3 — Access control (2026-08-25)

**What shipped.** The functions catalog with assignment, and per-user permission grants.
`PermissionCascader` grouping capabilities by prefix, and `UserPicker`.

**Why it mattered.** This is the screen that made runtime capability gating possible. Every
later gated feature in the app — and every one in `leaderboards`, `contests`, `gms`, `products`
and `wb-pipeline` — depends on a grant made here. See
[platform](../platform/PHASES.md#3-decision-log) decision P6.

**Decisions.** AD1.

### ~4 — File Vault admin, and the engine that came out of it (2026-08-31 → 2026-09-03)

**Goal.** Let an admin manage File Vault content.

**What shipped, in order.** File Vault admin arrived first as a self-contained screen with its
own `ItemFormModal` and `SectionFormModal`. Over four days it was reworked repeatedly —
auth-header handling, the file-upload body, then **removing `FileUploadField` and folding upload
into the item modal**. Then `sort_order` inputs were removed from both modals in favour of drag
ordering. Then, on 2026-09-03, Training Center admin arrived — and rather than copying the
screen, the shared `ContentPageAdminShell` and `ContentAdminApi` were extracted.

**Decisions.** AD2, AD3, AD4.

**Why this is the module's only real architecture.** The engine exists because a second consumer
appeared three days after the first. Nothing was designed up front; the generic shape was pulled
out at the exact moment duplication would otherwise have happened. That is also why
`home-content` does not use it — it arrived later with a shape the engine does not fit.

### ~5 — Level permissions (2026-09-14)

**What shipped.** Grants that apply to everyone at a hierarchy level.

**Divergence.** The levels list was wired to **`team`'s** prospect service rather than a service
of its own or shared reference data. Expedient, and still there.

### ~6 — Data-integrity reports (2026-09-21)

**What shipped.** Leader and policy misalignment screens, gated by a per-user grant, with the
access hook injected into the menu.

**Decisions.** AD5 — diagnosis only, no repair.

### ~7 — Products, and home content (2026-09-22)

**What shipped.** The product catalog with type selection and filtering, gated on
`products:read`. In the same week the admin menu was reorganised and home-page content
management was separated out as its own sub-feature.

### ~8 — Reporting pipeline (2026-09-25)

**What shipped.** Run history with heartbeat, and the two asynchronous recalculation actions.
Gated on `wbreporting:read` / `:manage` — **the same `my-access` endpoint** `leaderboards` and
`contests` use.

### ~9 — Company management in the product form (2026-09-27)

**What shipped.** The company selector became a `Combobox`, and companies can be created from
inside the product form rather than on a separate screen.

### 10 — Promotion Management (2026-10-06)

**What shipped.** `/admin/promotion`: skills, videos and quizzes for the Promotion dashboard,
edited in the app instead of Django admin. Drag to reorder; move a skill or video from its edit
form. Backend counterpart on `mlm_platform` `feature/promotion-admin` — **merge and deploy
together**; the page fails every request against a backend without the reorder endpoints.

**Decisions.** AD7, AD8, AD9.

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| AD1 | Every capability is granted here, never in a migration or in code | A rollout list is operational data, not a deployment artefact. It is also the standing convention the BPM work cites as decision D10 | `access-control/pages/user-permissions-page.tsx`; `BPM_V2_PLAN.md` D10 |
| AD2 | Extract a generic content shell rather than copy the File Vault screen | The second consumer arrived three days after the first, with the same section/item/role/order/upload shape and a different content type. A generic shell plus a per-consumer `ContentAdminApi` keeps them from drifting | `content-pages/types.ts:115`; commits 2026-08-31 → 09-03 |
| AD3 | Upload a file **after** the item exists, staging it in the form | `uploadItemFile` needs an item id, and inventing one client-side would mean a second source of truth. Cost: the form must hold the file across the create call, which is what `StagedFilePicker` is for | `content-pages/types.ts:130`; `StagedFilePicker` |
| AD4 | Drag ordering instead of a `sort_order` input | A numeric field makes the user compute the order the UI could just show. `sort_order` became optional in the payload and the inputs were replaced with drag handles and an explanatory line | commit 2026-08-31 "Remove sort_order from ItemFormModal and SectionFormModal" |
| AD5 | Data integrity reports diagnose; they do not repair | A repair tool would need to choose which of two contradictory records wins, and that is a business decision per case. Reporting makes the inconsistency visible without guessing | `misalignments/` — all endpoints are GET |
| AD7 | **Promotion's admin endpoints require `promotion:manage`**, seeded to ADMIN / SUPER_ADMIN / SUPERADMIN by migration | They were `IsAuthenticated` only — any signed-in agent could edit or delete promotion content. A deliberate exception to AD1: closing an open endpoint must not lock out the admins already using it, and it follows Training Center's `content/0006` seed. Further grants go through the access console as usual | `mlm_platform` `promotion/permissions.py`, `promotion/migrations/0002_promotion_manage_permission.py` |
| AD8 | **Promotion does not use the content engine** | Its tree is three levels deep (skill → video → quiz question), has no role access and no file upload — the engine's two-level section/item shape would fit none of it | `promotion/pages/admin-promotion-page.tsx` |
| AD9 | **Move by editing the parent, not by dragging across lists** | Cross-list drag on nested sortable lists is fiddly on touch and easy to trigger by accident; a select is explicit and also reaches skills in other tracks. Drag stays for ordering within one parent | `promotion/components/video-form-modal.tsx`, `skill-form-modal.tsx` |
| AD6 | `home-content` does not use the content engine | The home page is a fixed set of named slots — hero, carousels, video, register URL — not an ordered list of sections and items. Forcing it through the engine would mean modelling slots as a one-item section each | `home-content/pages/`, compared with `file-vault/pages/admin-file-vault-page.tsx:82` |

## 4. Deliberately not built

- **Misalignment repair.** AD5.
- **An `admin` backend app.** Each sub-feature talks to the app that owns its data. There is no
  administrative domain to own.
- **Shared admin state or a shared admin service.** No two sub-features show the same data, so a
  shared cache would have nothing to hold.
- **A `sort_order` input.** AD4.
- **Client-side dependency checking on delete.** The backend refuses a permission or section in
  use; the client does not try to predict it.
- **Cross-module capability documentation in the UI.** The permission catalog is rendered from
  `/api/authz/permissions/`, so the screen shows the strings but explains none of them. What each
  capability gates lives in that module's docs.

## 5. Outstanding

Ordered by how much confusion each removes.

1. **Make the twelve routes gate consistently.** Five mechanisms, including two routes with no
   client gate at all, is the module's worst property. The four capability guards are the right
   pattern; the six `AdminRoute` screens should move to a runtime `admin` capability, and
   `/admin/invite-agents` and `/admin/mission-ring-proof` should get one. This also fixes the
   stale-`isAdmin` surprise.
2. **Stop importing `team`'s prospect service for levels.** `level-permissions-page` reaches into
   `features/team/prospect/services/` for `fetchLevels`. Levels are reference data; they belong
   in a shared service or `core/`. As it stands a `team` refactor silently breaks an
   access-control screen.
3. **Give drag ordering a keyboard path.** `@dnd-kit` supports keyboard sensors and they are not
   configured, so section and item order cannot be changed without a pointer.
4. **Decide whether the six `useEffect` sub-features adopt React Query.** Three already have.
   Lower value than elsewhere, because these screens are small and single-purpose — but the
   inconsistency costs a reader time on every visit.
5. **Consider whether `home-content` should join the engine.** AD6 is defensible now; it would
   stop being so if a third slot-shaped content page appeared.
6. **Explain capabilities in the console.** The permission list shows raw strings. A description
   per capability, served from the backend catalog, would make granting one a decision rather
   than a guess.
