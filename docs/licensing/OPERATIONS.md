# Licensing — Operations

| | |
|---|---|
| **Module** | `licensing` |
| **Source** | `src/features/licensing/` |
| **Routes** | 4 under `/licensing/*` |
| **Backend module** | — |
| **API prefix** | — |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Environment and configuration

**None.** No `VITE_` variables, no backend state, no feature flags.

Everything configurable is **source code**: `VIDEO_LIST`, `COURSE`, `MODULES` and `DOCS`. Changing the
curriculum, a video URL or a document link is a code change and a deploy.

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)). Four lazy chunks.

This is the easiest module in the app to work on locally: no backend is needed, and no account state
matters beyond being signed in.

## 3. Feature flags and rollout

*Not applicable — no flags, no capability gates.* Every authenticated user gets the whole curriculum.

## 4. Tests and checks

No frontend tests ([platform OPERATIONS §4](../platform/OPERATIONS.md#4-tests-and-checks)).
`npm run lint` reports nothing in this module.

Manual checks — the first three are about storage, because storage is the whole module:

1. **Progress persists** across a reload.
2. **Progress is absent in a different browser**, and confirm the page gives no explanation. This is
   current behaviour, not a bug to fix in passing.
3. **Private browsing** — open the pages in a private window and confirm they do not crash. The reads are
   **unguarded**, so this is the check that catches a throwing accessor.
4. **Reset** clears progress and the key is gone from `localStorage`.
5. **Notes** persist per chapter, and survive navigating away and back.
6. **All fourteen chapters** render, and `buildChapters()` agrees with `VIDEO_LIST`.
7. **Every document link** in `DOCS` resolves.
8. **Every video URL** loads — there is no server validating them.

## 5. Deployment

Ships with any frontend deploy. No backend dependency and no coupled branch.

**A content change is a deploy.** Adding a chapter, fixing a video URL or updating a document link all
require a release, because the content is in the source. That is the practical cost of the current design
and the main argument for connecting the services.

**Changing a storage key resets everyone.** The keys carry a `_v1` suffix and nothing migrates, so bumping
one silently discards every learner's progress and notes on their next visit.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| **"My progress disappeared"** | a different browser, device, or cleared site data | `localStorage['lic_progress_v1']`. Progress is **per browser** — there is no server copy to restore |
| **"My notes are gone"** | same | `crash_notes_v1`. Notes exist only in that browser, and nothing warns about it |
| Progress does not persist at all | private mode, or blocked site data | expected; the reads are unguarded, so also check for a thrown error in the console |
| A leader cannot see a learner's progress | this module never tells the server | expected. [team](../team/)'s Licensing Tracker reads server-side licensing status, which is a different thing |
| A video will not play | a bad URL in `VIDEO_LIST` | the constant; nothing validates it |
| A document link 404s | a bad URL in `DOCS` | the constant |
| A chapter is missing | `buildChapters()` derives from `VIDEO_LIST` | the list, not a second chapter list |
| Content is wrong and cannot be edited | it is hard-coded | a code change and a deploy. It is **not** on [admin](../admin/)'s content engine |
| Everyone's progress reset after a release | a storage key changed | the `_v1` keys; nothing migrates |
| The unused services look broken | they are never called | expected — see [API.md §2](API.md#2-endpoints-consumed) |
