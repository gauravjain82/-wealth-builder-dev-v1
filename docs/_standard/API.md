# <Module> — API

| | |
|---|---|
| **Module** | `<feature-dir>` |
| **Source** | `src/features/<feature-dir>/services/` |
| **Routes** | `/path` |
| **Backend module** | `<app_label>` → `mlm_platform/docs/<app_label>/API.md` |
| **API prefix** | `/api/<prefix>/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `<sha>` — <YYYY-MM-DD> |

> Endpoints **consumed**, not exposed. The backend's `API.md` is the authority on what
> each one does; this file records what this module sends and reads.

## 1. Conventions

<Base URL, auth header, content type, trailing slashes, cancellation.>

## 2. Endpoints consumed

| Method | Path | Service function | Hook | Purpose |
|---|---|---|---|---|

## 3. Payload types

<Point at the type module rather than restating it. Note fields the client depends on and
any whose absence is meaningful.>

## 4. Query parameters

| Parameter | Values | Built by |
|---|---|---|

## 5. Error codes and handling

| Code | Status | Client behaviour |
|---|---|---|

## 6. Backend ownership

<What the server decides and the client must not: validation, masking, ranking,
permissions. Link the backend docs.>
