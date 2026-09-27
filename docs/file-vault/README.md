# File Vault — Overview

| | |
|---|---|
| **Module** | `file-vault` |
| **Source** | `src/features/file-vault/` |
| **Routes** | `/file-vault` |
| **Backend module** | `content` |
| **API prefix** | `/api/content/file-vault/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [API.md](API.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

File Vault is the document library: sections of files and links an agent can open, filtered by what their
role is allowed to see. The reader side is deliberately thin — a sidebar, a content pane, and a service —
because all the complexity lives in [admin](../admin/), which manages the content through a shared engine.

## 2. Scope

**In scope** — the `/file-vault` reader page, its sidebar and content pane, and opening a document.

**Out of scope** — managing sections and items ([admin](../admin/)'s `/admin/file-vault`, via
`ContentPageAdminShell`), and role access, which is applied **server-side**.

## 3. At a glance

| | |
|---|---|
| Routes | 1 |
| Components | 2 |
| Hooks | 1 |
| Services | 1 |
| Endpoints consumed | 2 |
| LOC (ts/tsx) | 634 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Section** | A group of documents, ordered and role-restricted. |
| **Item** | One document or link. |
| **Delivery mode** | How an item opens — inline, download or external link. Set in admin. |

## 5. Dependencies

**Upstream** — `src/shared/services/content-page-service`, which supplies `API_BASE_URL`,
`getAuthHeaders` and the shared `openContentDocument` helpers used by all three content readers.

**Downstream** — none.

**Backend** — `content`. The authority is `mlm_platform/docs/content/`, and
`content/FILE_VAULT_API.md` in the backend repo describes this API specifically.

## 6. Document map

Lite tier: this file plus [API.md](API.md), which carries the substance — the two endpoints, the shared
content-opening helpers, and the note about the legacy seed data.

Content **administration** is documented in [admin](../admin/ARCHITECTURE.md#the-content-administration-engine).

## 7. Where to start reading

1. `services/file-vault-service.ts` — the two endpoints.
2. `src/shared/services/content-page-service.ts` — the opening logic, shared with `training-center`.
3. `data/file-vault-data.ts` — **legacy seed data, not runtime content.** Its own header says so.
