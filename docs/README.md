# Wealth Builder frontend — documentation index

Every module in `src/features/` appears in the table below exactly once. The doc directory
name is the feature directory name, so `src/features/calendar-sync/` is documented in
`docs/calendar-sync/` — you can build the path from a source path without searching here.

- **The standard:** [`DOCUMENTATION_STANDARD.md`](DOCUMENTATION_STANDARD.md) — the six
  files, the front matter, the headings, the decision rules. Read it before writing docs.
- **The plan:** [`DOCUMENTATION_PLAN.md`](DOCUMENTATION_PLAN.md) — the remaining batches, the
  per-module process, and **the inventory of every decision source in either repo**. Read it before
  starting a module.
- **Templates:** [`_standard/`](_standard/) — copy into `docs/<module>/` to start.
- **The shell:** [`platform/`](platform/) — router, auth wiring, layout, data access,
  build. Read this before any module doc.
- **Backend:** `mlm_platform/docs/` follows the same standard. Each module's front matter
  names its backend app, and that app's `API.md` is the authority on server behaviour.

**All 28 feature modules are documented.** 25 have a doc directory — **14 Full** (six files) and
**11 Lite** (two) — and **3 are Indexed**: a row in the table below with a stated reason, no directory. Plus
[`platform/`](platform/) for the shell.

**No dangling doc citations remain in `src/`.** Every comment that once pointed at a vendor contract now cites
a real in-repo path and section.

## Doc tiers

| Tier | Meaning |
|---|---|
| **Full** | All six files |
| **Lite** | `README.md` plus the one file carrying the substance |
| **Indexed** | No directory — the row below is the documentation |

See [the standard §5](DOCUMENTATION_STANDARD.md#5-doc-tiers) for how a tier is assigned.

## Modules

`LOC` counts `.ts`/`.tsx` only. `Backend` is the Django app behind it.

### Full

| Module | Routes | Backend | LOC | Status | Docs |
|---|---|---|---|---|---|
| [admin](admin/) | `/admin/*` (12 routes) | `accounts`, `authz`, `audit`, `content`, `misalignments`, `tracker` | 8188 | Production | ✅ |
| [auth](auth/) | `/login`, `/signup`, `/reset-password` | `accounts` | 1272 | Production | ✅ |
| [bpm](bpm/) | `/bpm/*` (8 children), `/bpm/pass/:token` | `bpm`, `matchup` | 11750 | Production | ✅ |
| [builder-ai](builder-ai/) | `/builder-ai/*` (7 routes), `/team/builders/daily-six/:agencyCode` | `builderai` | 1781 | Production | ✅ |
| [calendar-sync](calendar-sync/) | **none** — a section of `/settings` | `calendarsync`, `matchup` | 816 | Production | ✅ |
| [contests](contests/) | `/contests`, `/admin/contest-settings`, embedded card | `wbreporting` | 2708 | **Gated** | ✅ |
| [events](events/) | `/events/*` (14), `/event/:shortcut/*` (4 public) | `events` | 11366 | Production | ✅ |
| [gms](gms/) | `/admin/guidance` + an embeddable `HelpAction` | `gms` | 2007 | **Merged-not-deployed** | ✅ |
| [leaderboards](leaderboards/) | `/leaderboards` | `wbreporting` | 2123 | Merged-not-deployed | ✅ **reference** |
| [licensing](licensing/) | `/licensing/*` (4 routes) | `accounts` — **not called** | 1405 | Production | ✅ |
| [matchup](matchup/) | `/matchup`, `/calendar` | `matchup`, `notifications` | 4563 | Production | ✅ |
| [promotion](promotion/) | `/promotion/dashboard`, `/promotion/team` | `promotion` | 1226 | Production | ✅ |
| [settings](settings/) | `/settings` | `accounts`, `authz`, `payments`, `telegram` | 2307 | Production | ✅ |
| [team](team/) | `/team/*` (7 trackers), `/onboarding-game`, 1 public | `accounts`, `network`, `tracker` | 22818 | Production | ✅ |

### Lite

Two files each: `README.md` plus the one carrying the substance.

| Module | Routes | Backend | LOC | Status | Substance | Docs |
|---|---|---|---|---|---|---|
| [ai](ai/) | — (mounted in `MainLayout`) | `ai` | 303 | Production | `API.md` | ✅ |
| [education](education/) | 5 (3 public) | — | 520 | Production | `UI.md` | ✅ |
| [file-vault](file-vault/) | `/file-vault` | `content` | 634 | Production | `API.md` | ✅ |
| [helpdesk](helpdesk/) | `/help-needed` (public), `/helpdesk`, `/admin/helpdesk` | `helpdesk` | 934 | Production | `API.md` | ✅ |
| [home](home/) | `/home` | `content`, `tracker` | 861 | Production | `UI.md` | ✅ |
| [insight-center](insight-center/) | `/insight-center`, `/public-insight-center` | — | 279 | Production | `UI.md` | ✅ |
| [legal](legal/) | `/privacy-policy`, `/terms-and-conditions` (both public) | — | 490 | Production | `UI.md` | ✅ |
| [systematic-tools](systematic-tools/) | `/systematic-tools` | — | 2948 | Production | `UI.md` | ✅ |
| [terminated-users](terminated-users/) | `/terminated-users` | `accounts` | 529 | Production | `API.md` | ✅ |
| [training-center](training-center/) | `/training-center` | `content` | 792 | Production | `API.md` | ✅ |
| [training-schedule](training-schedule/) | `/training-schedule` | — | 599 | Production | `UI.md` | ✅ |

### Indexed

| Module | What it is | Why no doc set |
|---|---|---|
| `home-v2` | `/home-v2`, 135 LOC, one page | Pure composition. Mounts `VideoHero`, both `CanvaVideoCard` slots and `PerformanceTable` from `home/` plus `LeaderboardsCard` from [leaderboards](leaderboards/) — nothing of its own to document. Gated on `homev2:read`, same rollout as leaderboards; see [leaderboards/PHASES.md](leaderboards/PHASES.md) decision L7 for why `/home` was not replaced. |
| `reports` | `/reports`, 18 LOC, one page | Stub. A placeholder page behind a live route. Promote to Lite when it does something. |
| `showcase` | `/components`, 455 LOC | Internal component gallery, not a product surface. `src/features/showcase/pages/components-showcase.tsx` is its own documentation. |

\* Statuses marked with an asterisk are inherited from the route table and the router's
guards, not from reading the module. They are confirmed — or corrected — when that
module's doc set is written.

## Writing order

Modules are documented in batches, ordered so that the things everything else depends on
land first. Update this table when a batch completes.

| # | Batch | Modules | Status |
|---|---|---|---|
| A | Standard, templates, index, shell | `DOCUMENTATION_STANDARD.md`, `_standard/`, `README.md`, `platform/` | ✅ done |
| B | Reference module | `leaderboards` | ✅ done |
| B2 | Homeless root docs | `auth`, `calendar-sync` | ✅ done |
| C | The large domains | `bpm`, `team`, `admin`, `builder-ai` | ✅ done |
| D | Vendor-package modules | `contests`, `gms` | ✅ done |
| E | Remaining large domains | `events`, `matchup` | ✅ done |
| F | Money and identity-adjacent | `settings`, `licensing`, `promotion` | ✅ done |
| G | Content consumers | `home`, `file-vault`, `training-center`, `insight-center`, `education` | ✅ done |
| H | The small remainder | `ai`, `helpdesk`, `terminated-users`, `legal`, `systematic-tools`, `training-schedule` | ✅ done |

`auth` and `calendar-sync` were pulled forward because each had a document sitting at the repository root
with nowhere to go.

**The backlog is empty.** What remains is upkeep, not coverage: keep each module's `Verified against` commit
honest, and copy [`_standard/`](_standard/) into `docs/<module>/` when a new feature directory appears —
before its first feature commit lands.

## Known documentation debt

| Item | Detail |
|---|---|
| ~~Dangling doc citations in code~~ | **Cleared.** All 28 comments that cited `UI_CONTRACT.md`, `APPLICATION_CONTRACT.md`, `DATA_CONTRACT.md`, `API_CONTRACT.md`, `AGENTS.md`, `OWNER_DECISIONS.md`, `BPM_V2_PLAN.md` or `WB_GMS_PROGRESS.md` now cite a real in-repo path and section. Their content was folded into the relevant `docs/<module>/` files, so losing `mlm_platform/temporary/` loses nothing. Verify with the grep in [`DOCUMENTATION_PLAN.md`](DOCUMENTATION_PLAN.md#checks) — it should return 0. |
| Not a citation | `src/features/showcase/pages/components-showcase.tsx:449` renders the text `UI_COMPONENTS_GUIDE.md` as a placeholder link with `href="#"`. It is demo content in the internal component gallery, not a reference to a document. Left alone. |
| Archived | [`_archive/`](_archive/) holds six superseded documents. **Do not cite them.** Three described a Firebase repository architecture this codebase no longer has (`ARCHITECTURE.md`, `QUICK_START.md`, `MIGRATION_GUIDE.md`) and are superseded by [`platform/`](platform/). `AUTHENTICATION_ROUTING.md` was wrong about where an authenticated user lands, superseded by [`auth/`](auth/). `CALENDAR_SYNC_PROGRESS.md` was accurate but silently incomplete after its Phase 11, superseded by [`calendar-sync/`](calendar-sync/). `ADMIN_CONTENT_MANAGEMENT_GUIDE.md` specified 18 endpoints under `/api/admin/pages/*` that were never built — the real content API is `/api/content/`, and `mlm_platform/docs/content/` is its authority. Each carries a banner naming its replacement and what it got wrong. |
| Root is clean | The repository root now holds only `README.md` and `CLAUDE.md`. Every other document lives under `docs/`. Keep it that way: a new document goes in `docs/<module>/` or it does not get written. |
