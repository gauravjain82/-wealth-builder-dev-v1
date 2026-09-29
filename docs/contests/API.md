# Contests — API

| | |
|---|---|
| **Module** | `contests` |
| **Source** | `src/features/contests/services/contests-service.ts` |
| **Routes** | `/contests`, `/admin/contest-settings`, embedded card |
| **Backend module** | `wbreporting` → `mlm_platform/docs/wbreporting/API.md` |
| **API prefix** | `/api/wbreporting/` |
| **Status** | Gated |
| **Doc version** | 1.0 |
| **Verified against** | commit `743afe1` — 2026-09-30 (parity phase 21 audit) |

> Endpoints **consumed**, not exposed.

## 1. Conventions

Identical to [leaderboards](../leaderboards/API.md#1-conventions) by design — same auth header, same
error shape, same guarded parse — so the two siblings cannot drift.

| | |
|---|---|
| Base | `${VITE_API_BASE_URL}/api/wbreporting` (`:29-30`) |
| Auth | `Authorization: Token <localStorage['wb.authToken']>` (`:48`) |
| Cancellation | every read takes an `AbortSignal`, forwarded from React Query |
| Errors | non-2xx → `ContestError` with `status` and the backend's `code` (`:33`) |
| Reads | `getJson` |
| Writes | `sendJson`, which returns `undefined` on 204 (`:226`) |
| **Uploads** | `FormData` with **no `Content-Type` header** |

The upload rule is worth stating because getting it wrong fails unhelpfully: the browser must set the
multipart boundary itself, and overriding it with `application/json` produces an opaque parser error
(`:308`).

## 2. Endpoints consumed

From `contests-service.ts`: 12 `wbreporting` paths, 14 method + path pairs — five reads under
`homev2:read`, and under `wbreporting:manage` two reads and seven writes — plus the
`accounts/users/` person search. `my-access` is called by the shared access module, not by this
one; it needs only authentication.

### Reads

| Method | Path | Service function | Hook |
|---|---|---|---|
| GET | `/my-access/` | `fetchWbReportingAccess` (`@shared/wbreporting-access`) | `useContestAccess`, a selector over `useWbReportingAccess` |
| GET | `/contest-board/` | `fetchContests` | `useContests` |
| GET | `/contest-board/{id}/standings/` | `fetchStandings` | `useStandings` |
| GET | `/contest-board/{id}/proof/` | `fetchProof` | `useProof` |
| GET | `/contest-board/{id}/agents/{agentId}/` | `fetchAgentProfile` | `useAgentProfile` |
| GET | `/contest-board/{id}/flyer/` | `fetchFlyer` | `useFlyer` |
| GET | `/api/accounts/users/?has_agency_code=true&page_size=10&search=` (not under the prefix) | `searchPeople` (`:104-106`) | `usePersonSearch`, `useFindPeople` |

### Writes — settings

| Method | Path | Service function |
|---|---|---|
| GET | `/contest-settings/` | `fetchEditorOptions` |
| GET · POST | `/contest-settings/contests/` | `fetchEditableContests`, `createContest` |
| PUT | `/contest-settings/{id}/` | `saveContest` |
| PATCH | `/contest-settings/{id}/visibility/` | `setContestHidden` |
| PATCH | `/contest-settings/{id}/flyer-visibility/` | `setFlyerVisible` |
| POST · DELETE | `/contest-settings/{id}/flyer/` | `uploadFlyer`, `removeFlyer` |
| DELETE | `/contest-settings/{id}/delete/` | `deleteContest` |

**`/contest-settings/contests/` rather than Package 1's `contests/` CRUD** is deliberate: that
serializer carries no `revision`, so a save built from it could never satisfy the concurrency check
(`:237`).

`my-access` is **the same endpoint** [leaderboards](../leaderboards/API.md#2-endpoints-consumed) and
`admin/wb-pipeline` call. One payload, three consumers, three different flags.

## 3. Payload types

`types/index.ts` (386 lines), mirroring `wbreporting/serializers_contests.py`. Its header states the
two rules that a well-meaning edit would break:

1. **`progress` is `number | null`, and `null` means there is no number** — an ineligible cell.
   Never coalesce it to `0`; a zero reads as a real score. Every number is a whole percentage (C20).
2. **Nothing here describes a daily result row.** Django prepares the standings; the browser receives
   *evaluations*.

| Type | Note |
|---|---|
| `ContestScope` | `all \| personal \| base \| smd_base \| super_base \| super_team`. **`net` is a filter, not a scope** |
| `ContestStatus` | three reader values derived from five stored ones |
| `ThresholdMetric` | the eleven configurable metrics |
| `TierRequirement` | carries `single_hop_team` and `available` |
| `TierSummary` | every visible tier, with `selected`; counts over the whole contest, `in_running` the same on every tier (C18). `non_license` since parity phase 19, for the goals line |
| `TierEvaluation` | `eligible`, `progress`, `qualified`, `near`, `unmeasured`, `metrics`. `unavailable` and `partially_measurable` were removed in parity phase 17 (C15) |
| `MetricProgress` | `actual` is `0` for a metric with no source, which keeps `available: false` and its reason (C15) |
| `StandingRow` | identity plus `evaluations` keyed by tier. Since parity phase 19, `leader_name` (name, else code, else `""`), and `level` and `leader_name` are **absent** when the display settings hide them, so `""` always means *none* ("No level", "Leader: -"). `agency_code` is still `""` when hidden. Backend `mlm_platform` `8deb2cd`, `caa7579`, coupled |
| `StandingsResponse` | rows, tiers, cursor, `near_percent`, `team_credit_note`, display switches, echoed `filters`. **No `uncoded_member_count`** since Phase 11: the backend resolves scopes over coded users only (C22), so there is nothing to count. Leaderboards keeps its own field of that name, from a different endpoint |
| `ProofResponse` | period, columns, rows, cards, formula, cursor. Since parity phase 20: `source_total` (the metric over **every** source row — a count, or net points — not only the page), `truncated` (the page is the first 1,000 rows), `detail_visibility` (`hidden` / `masked` / `full`, for the proof's subject), and rows in dtez's three shapes: recruits (`date`, `person`, `person_id`, `person_code`, `owner`, `owner_id`, `owner_code`), points per policy (`policy_number`, `client_name` — **absent** when hidden —, `first_date`, `last_date`, `first_advance`, `second_advance`, `other_advance`, `chargebacks` (negative), `net_points`), events (`date`, `event`, person and owner as for recruits, `reference`). **`sql` and `sql_params` exist only for `wbreporting:manage`**; the server omits both keys for everyone else, and sends `sql: ""` to a manager for a metric with no source query. The first three are optional in the type, for a backend older than phase 20. Backend `mlm_platform`, coupled; ⟦P20⟧deployed together with `206c8c8`⟦/P20⟧ |
| `ProfileResponse` / `ProfilePathNode` | Since parity phase 20, `level` is **absent** when the display settings hide it — on the profile and on every path node — so `""` always means *none* ("No level"). Coupled with the backend, as `StandingRow.level` was in phase 19 |
| `FilterDraft` / `StandingsQuery` | draft state vs what is actually queried |
| `EditableContest` / `EditableTier` | carry **`revision`**; `pending_delete` is client-only |
| `EditorOptions` | levels, metrics, statuses, period modes, flyer limits — **served, not hard-coded** |
| `LevelOption.synthetic` | always false since parity phase 17: `NON` is no longer offered (C19) |
| `MetricOption.measurable` | false for metrics this deployment has no source for; the input stays enabled and says it counts as 0 (C15) |

`TierEvaluation.metrics` is **empty** for an ineligible cell: there is deliberately no number to
display.

## 4. Query parameters

`standingsParams` (`:128`) builds them, so the card, the sort and the pager cannot disagree.

| Parameter | Note |
|---|---|
| `scope` | always sent |
| `net`, `leaders`, `agents` | booleans, always sent |
| `person` | sent **only** when set **and** `scope !== 'all'` |
| `tiers` | comma-joined, omitted when nothing is selected |
| `sort_tier` | omitted when null |
| `cursor` | pagination |

Proof takes `agent_id`, `tier_id`, `metric` and an optional `cursor` — **and no dates.** `fetchProof`
accepts a cursor, but `useProof` never passes one and no dialog pages a proof: it shows the first
page, up to 1,000 rows, flagged by `truncated`. The server
resolves the period from the tier, because a browser-supplied window is not authoritative and a client
that could choose one could show a number the standings cell never claimed.

## 5. Error codes and handling

Eighteen stable codes (`types/index.ts:29-47`) — the largest vocabulary in the app.

| Code | Meaning | Client behaviour |
|---|---|---|
| `contest_not_found`, `tier_not_found`, `agent_not_found` | 404s | surfaced |
| `profile_forbidden` | may not see this agent | dialog reports it; `retry: false` |
| `flyer_not_found` | no flyer | dialog reports it |
| `invalid_scope`, `invalid_period`, `invalid_request` | bad request | should be unreachable — controls are server-driven |
| `metric_not_supported` | not rankable | " |
| `person_required` | a scope needing a person got none | " |
| **`edit_conflict`** | **409 — somebody else saved first** | **the one a caller must *handle*: reload, never retry** |
| `invalid_tier_threshold`, `invalid_level_rule`, `invalid_tier_order` | tier validation | shown against the field |
| `flyer_file_required`, `flyer_size_invalid`, `flyer_type_invalid` | upload validation | shown on the upload control; limits come from `EditorOptions.flyer` |
| `storage_failed` | the file store failed | retryable |

`edit_conflict` is the only code with a mandated client behaviour. Everything else is reported;
this one must **reload**, because retrying is the silent overwrite the revisions exist to prevent
(`:214`).

## 6. Backend ownership

`wbreporting` owns, and the client must not recompute:

- **Aggregation, eligibility and ranking.** The client receives evaluations, not result rows.
- **Pagination**, 50 default / 200 maximum, by cursor.
- **The period for any proof request.** No dates cross the wire.
- **Eligibility semantics** — Non-License via `LicensingTracker.is_licensed`, level rules, and the
  fact that all-levels and no-levels collapse to the same "anyone".
- **Measurability.** Which metrics this deployment can measure, per tier period; `mr` is
  computed at read time and gated on `WB_MILESTONE_TIMESTAMPS_SINCE`. `mp` is a daily column
  since backend parity phase 14, measurable for any period, with its own proof page — the
  screen needs no change, because it renders availability and proof rows from the response.
- **The qualified rule**: never `qualified` while any requirement is unmeasurable (C7).
- **Optimistic concurrency.** Revisions are issued and checked server-side; a tier edit bumps the
  contest's revision too.
- **Whether an omitted tier is deleted** — only on explicit `replace_tiers`.
- **Flyer storage and signing.** URLs are short-lived (≈15 minutes).
- **Status derivation** — three reader values from five stored ones.
- **The editor's own options.** Levels, metrics, statuses, period modes and flyer limits are served,
  so a level added to `accounts.Level` appears here with no release.

The client owns draft filters, tier selection, which controls to offer, the containment of its own
card, and reloading on a 409.

**One cross-surface consequence worth knowing.** `slic` counts `agent_approval_date` while the
Non-License rule reads `LicensingTracker.is_licensed` — a *different column*. The two can therefore
disagree inside one contest, and a backend test asserts that they can (decision C1). It is not a bug
to be reconciled in the client.
