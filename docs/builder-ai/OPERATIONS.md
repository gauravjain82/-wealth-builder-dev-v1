# Builder AI — Operations

| | |
|---|---|
| **Module** | `builder-ai` |
| **Source** | `src/features/builder-ai/` |
| **Routes** | 7 + 1 public |
| **Backend module** | `builderai` |
| **API prefix** | `/api/builderai/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Environment and configuration

No module-specific `VITE_` variables.

Configuration is backend state, read through `GET /api/builderai/config/`:

| Configured | Where | Effect |
|---|---|---|
| Individual targets (5 / 20,000 / 1 / 3) | `tracker/services/builder_results.py` | every goal in the module |
| `owner_min_level` | backend | which levels count as company owners (SMD and up) |
| Seat cap (10 per baseshop) | `BuilderMembership` | how many builders a baseshop may enrol |
| Builder membership | an active `BuilderMembership`, created by invitation or self-add | who appears at all. **Not** `is_key_player` (B9) |

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). Six lazy chunks.
`recharts` is in the shared vendor chunk, not this module's.

To see anything locally you need `can_view` — owner, active builder, or pending invitee. There is
no dev bypass, and an account with no builders in scope renders empty rather than sample data.

## 3. Feature flags and rollout

No client-side flags. One capability, two flags:

| Flag | From | Grants |
|---|---|---|
| `can_view` | `/api/builderai/my-access/` | the route and the menu group |
| `is_owner` | same payload | the **full** menu group; a non-owner builder sees Baseshop and Invitations only |

`can_view` is **not plan- or role-based** — it is true for an owner, an active builder, or a
pending invitee. Someone becomes an active builder by accepting an invitation or self-adding,
which creates an active `BuilderMembership`. Setting `is_key_player` in `team` does **not** do it
(B9).

**The menu split is not a security boundary.** `BuilderAiRoute` admits anyone with `can_view`, so
a non-owner who types `/builder-ai/company` reaches the page; the backend decides what it
returns.

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)). The
backend suite is the real safety net and was at 21 `builderai` tests green as of the Company
redefinition.

`npm run lint` reports nothing in this module.

Manual checks — the first two are the ones that have caught real bugs:

1. **Company card goal sanity.** Compare the card goal against the number of builders in the
   company × target. If it looks like `(number of SMD legs) × target` instead, the card is reading
   the wrong denominator. This was a real bug: 19 SMDs × 5 = 95 for a company of hundreds.
2. **Per-row goal sanity.** Each SMD row's goal should reflect the builders in *that* leg, not the
   company and not one plan.
3. **Segment switch** — toggle company ⇄ baseshop on Home and confirm both cards and rows change.
4. **Owner drill-down** — `/builder-ai/company/:ownerId` shows that owner's legs.
5. **Zero-builder leg** — confirm it shows one plan rather than a division error.
6. **Seats** — fill a baseshop to 10 and confirm an eleventh send is refused.
7. **Invitation round trip** — send, accept, and confirm both the list and the seat count update
   (all six mutations invalidate the whole tree, so this should be automatic).
8. **Non-owner menu** — a builder who is not an owner sees only Baseshop and Invitations.

## 5. Deployment

Ships with any frontend deploy; `builderai` is in production.

**A backfill has already run and grandfathers everyone.** When the seat guards were introduced,
existing key players were grandfathered — any level, no cap. The guards apply to **new** toggles
only. Do not reason about current membership as though the cap had always applied.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| A card goal looks far too small | the card is using the owner-leg count instead of the company builder count | the two denominators in [ARCHITECTURE.md §3.2](ARCHITECTURE.md#32-the-company-scope). This is the bug this module has had twice |
| Company rows are not builders | they are not meant to be — they are directly-sponsored SMD-and-up owners | expected since 2026-09-08 |
| "N builders in scope" over owner rows | a known, unfixed label | expected. The count is owner legs |
| A *Built* badge on an owner row | `is_built` is always false for owners; the badge renders anyway | a known cosmetic issue |
| Reporting disagrees with the Company page | Reporting was deliberately left on the whole-downline definition | expected; only Home's company card, Company and the roster branched |
| A dashboard is slow | the Company path aggregates live rather than reading materialised rows | expected at small direct-SMD counts. Materialise if a top owner's legs grow |
| Everything was slow before, now fast | `BuilderMonthlyAggregate` replaced the live path, which took 8–10 s | expected |
| A user is a builder but sees nothing | `can_view` false, or no builders in their scope | `/api/builderai/my-access/`; then whether anyone below them has an **active membership** |
| Someone with the tracker Builder checkbox is not a builder | `is_key_player` was decoupled (B9) | they need an invitation or a self-add. **There was no backfill** — anyone who was only `is_key_player` stopped being a builder |
| Menu is missing Company for a builder | they are not an owner | `is_owner` in the access payload |
| A non-owner reached Company by URL | the guard only checks `can_view` | expected; the backend scopes the response |
| Bulletin fires a request per keystroke | `search` is in the query key with no debounce | known — see [PHASES.md §5](PHASES.md#5-outstanding) |
| Seat count wrong after an action | all six mutations invalidate the invitation root | if not updating, the mutation is not using the key factory |
