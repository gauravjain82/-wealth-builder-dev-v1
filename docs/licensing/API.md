# Licensing — API

| | |
|---|---|
| **Module** | `licensing` |
| **Source** | `src/features/licensing/*/services/` |
| **Routes** | 4 under `/licensing/*` |
| **Backend module** | `accounts` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> **This module consumes no endpoints.** Three services exist; none is imported. This file records what
> was built, so that wiring it up later starts from what is already there.

## 1. Conventions

The three services follow the platform conventions ([platform API §1](../platform/API.md#1-conventions))
correctly — `Authorization: Token`, a throw when the token is missing, JSON headers. They were written to
be used.

## 2. Endpoints consumed

**None.** The three that exist, and their state:

| Method | Path | Service function | Called by |
|---|---|---|---|
| GET | `/api/accounts/licensing-progress/` | `fetchLicensingProgress` | **nothing** |
| GET | `/api/accounts/course-progress/` | `fetchCrashCourseProgress` | **nothing** |
| GET | `/api/accounts/licensing-documents/` | `fetchLicensingDocuments` | **nothing** |

Verify with:

```bash
grep -rn "track-my-license-service\|crash-course-service\|licensing-documents-service" src
# no matches
```

Where progress actually lives: `localStorage` keys `lic_progress_v1`,
`crash_vid_progress_v1` and `crash_notes_v1` — see
[ARCHITECTURE.md §5](ARCHITECTURE.md#5-local-and-url-state).

## 3. Payload types

Almost none, and that is itself informative:

| Function | Return type |
|---|---|
| `fetchLicensingProgress` | **`Promise<unknown>`** — the shape was never modelled |
| `fetchCrashCourseProgress` | `Promise<Record<string, number>>` |
| `fetchLicensingDocuments` | a document list |

`unknown` is the clearest evidence of how far the integration got: the client was written before anybody
looked at what the endpoint returns.

The **content** types are inline in the pages, alongside the constants they describe (`CourseInfo`,
`Module` in `crash-course-page.tsx`).

## 4. Query parameters

*Not applicable — no request is made.*

## 5. Error codes and handling

*Not applicable in practice.* Each service would throw on a non-2xx with the status text; none runs.

The error case that **does** exist is client-side: `localStorage` can throw in a private window or with
site data blocked, and these pages parse it without a guard.

## 6. Backend ownership

`accounts` owns the three endpoints and, presumably, a server-side notion of licensing progress. **The
client currently ignores it**, so:

- the server's idea of progress and the learner's are independent;
- [team](../team/)'s Licensing Tracker reads the server's, so a leader and a learner see different things;
- the curriculum is owned by **the source code**, not by [admin](../admin/)'s content engine.

Whoever connects these services should decide first which side wins for a learner who has local progress
and no server record.
