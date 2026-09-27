# File Vault — API

| | |
|---|---|
| **Module** | `file-vault` |
| **Source** | `src/features/file-vault/services/file-vault-service.ts` |
| **Routes** | `/file-vault` |
| **Backend module** | `content` → `mlm_platform/docs/content/API.md` |
| **API prefix** | `/api/content/file-vault/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed.

## 1. Conventions

This module uses **the app's shared HTTP helpers** — `API_BASE_URL`, `getAuthHeaders` and
`request` from `src/shared/services/content-page-service.ts` — rather than re-declaring its own. It is one
of the few that does ([platform API §1](../platform/API.md#1-conventions)), together with the other content
readers.

## 2. Endpoints consumed

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/content/file-vault/` | sections, already filtered by role |
| GET | `/api/content/file-vault/items/` | the items |

Both are **reader** endpoints. The matching admin surface is `/api/content/admin/file-vault`, consumed by
[admin](../admin/API.md#content--the-three-content-sub-features).

**Role filtering is applied server-side**, so a section this user may not see is simply absent. The client
does no filtering of its own — which is what makes the admin screen's role picker a real gate rather than a
display preference.

## 3. Payload types

`types.ts` declares the reader shapes. The shared module supplies the cross-content ones:
`ContentItemAccess`, `ContentOpenable`, `ContentViewerTarget`, `ContentItemEndpoints`.

## 4. Query parameters

Section filtering and search are handled by the page over the fetched set.

## 5. Error codes and handling

No typed errors; `parseError` from the shared module yields a message.

| Situation | Behaviour |
|---|---|
| A section is missing | role filtering excluded it — not an error |
| A file will not open | `openContentDocument` falls back by delivery mode |
| PDF vs link | decided by `isContentPdf`, in the shared module |

## 6. Backend ownership

`content` owns section and item storage, ordering, **role filtering**, delivery mode, and file URLs. The
client renders what it is given and opens it.

**A note on the legacy data file.** `data/file-vault-data.ts` is static seed data for the backend's
`seed_file_vault` command, and its own header says runtime content comes from the API. **Nothing in `src/`
imports it** — verified by grep. It is not a fallback and not a content source; treat it as a fixture that
happens to live in the frontend tree.
