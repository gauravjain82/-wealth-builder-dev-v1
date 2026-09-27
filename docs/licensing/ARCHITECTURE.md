# Licensing — Architecture

| | |
|---|---|
| **Module** | `licensing` |
| **Source** | `src/features/licensing/` |
| **Routes** | 4 under `/licensing/*` |
| **Backend module** | `accounts` — not called |
| **API prefix** | `/api/accounts/` — not called |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

Three sub-areas, each a page plus a service — **and every one of those services is dead code.**

| Sub-area | Page | Service | Service used? |
|---|---|---|---|
| `track-my-license` | 384 lines | `track-my-license-service.ts` (18) | **No** |
| `crash-course` | 411 + 488 lines | `crash-course-service.ts` (18) | **No** |
| `licensing-documents` | 64 lines | `licensing-documents-service.ts` (22) | **No** |

Verified by grep: **no file in `src/` imports any of the three.** Each is a correct, complete client for
an endpoint that exists — `fetchLicensingProgress`, `fetchCrashCourseProgress`,
`fetchLicensingDocuments` — with no caller.

`fetchLicensingProgress` returns `Promise<unknown>`, which is a fair signal of how far the integration
got: the response shape was never modelled.

So the real layering is two layers:

| Layer | What |
|---|---|
| Page | the curriculum as constants, the progress logic, and the rendering |
| `localStorage` | the only persistence |

## 2. Component map

```
/licensing/track ──────── TrackMyLicensePage
                           ├── VIDEO_LIST            (hard-coded, :9)
                           ├── buildChapters()       (ch1…ch14, :66)
                           └── localStorage 'lic_progress_v1'

/licensing/crash-course ── CrashCoursePage
                           ├── COURSE                (hard-coded, :39)
                           └── MODULES               (hard-coded, :48)

/licensing/chapter/:id ─── ChapterCoursePage
                           ├── localStorage 'crash_vid_progress_v1'
                           └── localStorage 'crash_notes_v1'

/licensing/documents ───── LicensingDocumentsPage
                           └── DOCS                  (hard-coded, :9)

services/ × 3  ──────────  imported by nothing
```

No components directory and no shared pieces between the sub-areas.

## 3. Primary flows

### 3.1 Tracking progress through the chapters

1. `buildChapters()` derives fourteen chapters from `VIDEO_LIST`.
2. On mount the page reads `localStorage['lic_progress_v1']` (`:71`).
3. Watching a video updates state and writes the whole progress object back (`:107`).
4. A reset removes the key (`:184`).

There is no server round trip at any point.

### 3.2 Crash-course progress and notes

`ChapterCoursePage` keeps two keys: `crash_vid_progress_v1` for watched videos and `crash_notes_v1` for
the learner's notes, both read and written as whole JSON objects.

Notes in particular are worth noticing: a learner may write substantial text that exists **only in that
browser**.

## 4. Server state and caching

**There is none.** No React Query, no `useEffect` fetch, no service call.

The consequences are concrete and all follow from one choice:

| Consequence | Why |
|---|---|
| Progress is **per browser**, not per person | `localStorage` is origin-scoped and device-local |
| Signing in elsewhere shows **no progress** | nothing is on the server |
| Clearing site data **loses everything**, including notes | same |
| Private browsing keeps nothing | same |
| A leader's Licensing Tracker cannot see this progress | [team](../team/) reads server data |
| A curriculum change needs a **release** | the content is a constant |

The last two are the ones that surprise people, because both look like bugs and are consequences of the
design.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Chapter progress | `TrackMyLicensePage` | `localStorage['lic_progress_v1']` |
| Video progress | `ChapterCoursePage` | `localStorage['crash_vid_progress_v1']` |
| Notes | `ChapterCoursePage` | `localStorage['crash_notes_v1']` |
| `chapterId` | the URL | `/licensing/chapter/:chapterId` |

The `_v1` suffix on all three keys suggests migration was anticipated. Nothing reads a `_v0`, so no
migration has happened.

**None of the reads is guarded against a throwing accessor.** `localStorage` can throw in a private window
or with site data blocked, and these pages parse it directly — unlike `bpm`, which wraps every access in
try/catch. Recorded in [PHASES.md §5](PHASES.md#5-outstanding).

## 6. Permissions and gating

**None.** All four routes are under `ProtectedRoute` only. Any authenticated user can reach the whole
curriculum, which is appropriate — study material is not privileged.

There is also nothing to authorise, since there are no requests.

## 7. Integration points

- **`accounts`, notionally** — three endpoints exist for this module and none is called.
- **[team](../team/)'s Licensing Tracker** — the leader-facing view of licensing, reading server data.
  **The two are unconnected**, which is the most important integration fact here: what a learner sees and
  what their leader sees come from different sources.
- **[admin](../admin/)'s content engine** — manages File Vault and Training Center content. Licensing is
  **not** on it, so its content cannot be edited by an operator.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| Progress survives a reload | `localStorage` | nothing to show on return |
| Each storage key holds one JSON object | write-whole-object | a partial write corrupting progress |
| `buildChapters()` is the single source of chapter structure | derived from `VIDEO_LIST` | chapters and videos disagreeing |
| Reset clears the key entirely | `removeItem` | a half-reset state |

**The module's real failure mode is silent loss.** There is no error state for "your progress was in
another browser", because from the page's point of view an absent key and a new learner are identical. A
learner who switches device sees an untouched curriculum and no explanation.

**And a reporting gap.** Because nothing reaches the server, a leader cannot see that someone has worked
through ten chapters. The Licensing Tracker shows server-side licensing status, which advances for
entirely different reasons.
