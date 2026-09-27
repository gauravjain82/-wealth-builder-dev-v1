# Helpdesk — Overview

| | |
|---|---|
| **Module** | `helpdesk` |
| **Source** | `src/features/helpdesk/` |
| **Routes** | `/help-needed` (**public**), `/helpdesk`, `/admin/helpdesk` |
| **Backend module** | `helpdesk` → `mlm_platform/docs/helpdesk/` |
| **API prefix** | `/api/helpdesk/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [API.md](API.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

Support ticketing, with a deliberately **public** front door: somebody locked out of their account still
needs a way to ask for help, so `/help-needed` submits a ticket with no session and looks one up with a
ticket number plus an email.

The admin side is the queue: filter, read, comment, change status and priority.

## 2. Scope

**In scope** — public submission, public lookup, the signed-in view, and the admin queue.

**Out of scope** — notification delivery (`notifications`), and account recovery, which
[auth](../auth/) handles through the password-reset flow.

## 3. At a glance

| | |
|---|---|
| Routes | 3 — **one public** |
| Pages | 2 |
| Services | 1 |
| Endpoints consumed | 3 families |
| LOC (ts/tsx) | 934 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Ticket number** | The public identifier, half of the lookup credential. |
| **Lookup** | Ticket number + email, with **no session** — the same pattern [events](../events/) uses for guest tickets. |
| **Status** | `open`, `in_progress`, `resolved`, `closed`. |
| **Priority** | `low`, `medium`, `high`. |
| **Category** | A ticket classification. |

## 5. Dependencies

**Upstream** — `src/shared/components/ui/`.

**Downstream** — `src/router/index.tsx`, three routes, one outside `ProtectedRoute`.

**Backend** — `helpdesk`. `helpdesk/HELPDESK.md` in the backend repo describes it more fully.

## 6. Document map

Lite tier: this file plus [API.md](API.md), which carries the endpoints and the public/authenticated split.

## 7. Where to start reading

`services/helpdesk-service.ts` — the whole contract. Note `authHeaders()` throws at `:75` while
`submitHelpdeskTicket` and `lookupHelpdeskTicket` deliberately do not use it.
