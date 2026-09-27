# Helpdesk — API

| | |
|---|---|
| **Module** | `helpdesk` |
| **Source** | `src/features/helpdesk/services/helpdesk-service.ts` |
| **Routes** | `/help-needed`, `/helpdesk`, `/admin/helpdesk` |
| **Backend module** | `helpdesk` → `mlm_platform/docs/helpdesk/API.md` |
| **API prefix** | `/api/helpdesk/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed.

## 1. Conventions

**One service, two auth postures** — unlike [events](../events/), which splits them into two files.

| Function group | Auth |
|---|---|
| `submitHelpdeskTicket`, `lookupHelpdeskTicket` | **none** — no header at all |
| everything admin | `authHeaders()`, which **throws** when the token is missing (`:75`) |

Keeping both in one file works because the public functions simply do not call `authHeaders()`. It is worth
knowing when editing: adding a header to a shared helper here would break the public front door.

## 2. Endpoints consumed

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/helpdesk/tickets/` | **none** | submit a ticket |
| GET | `/api/helpdesk/tickets/lookup/?ticket=&email=` | **none** | look one up |
| GET | `/api/helpdesk/admin/tickets/` | token | the queue, with filters |
| GET | `/api/helpdesk/admin/tickets/{number}/` | token | one ticket |
| PATCH | `/api/helpdesk/admin/tickets/{number}/` | token | status, priority, comments |

The lookup pattern — an identifier plus an email, no session — is the same one
[events](../events/PHASES.md#3-decision-log) uses for guest tickets (its decision E7). Here the reason is
sharper: somebody who cannot sign in is exactly the person who needs to raise a ticket.

## 3. Payload types

| Type | Note |
|---|---|
| `HelpdeskCategory` | the classification union |
| `HelpdeskStatus` | `open \| in_progress \| resolved \| closed` |
| `HelpdeskPriority` | `low \| medium \| high` |
| `PublicTicketSubmitPayload` / `Response` | what a stranger sends and gets back — the response carries the **ticket number** they will need to look it up |
| `HelpdeskTicketLookupResponse` | the ticket plus its comments |
| `HelpdeskComment` | one comment |
| `AdminTicketListItem` → `AdminTicketDetail` | queue row, then full detail |

## 4. Query parameters

| Parameter | Endpoint |
|---|---|
| `ticket`, `email` | public lookup — both required |
| status, priority, category filters | the admin queue |

## 5. Error codes and handling

No typed errors; each function throws with the response's message.

| Situation | Behaviour |
|---|---|
| Bad lookup pair | rejected — the ticket number alone is not enough |
| No token on an admin call | **throws** before the request |
| `/admin/helpdesk` opened without permission | the route has **no client guard**; the API refuses |

## 6. Backend ownership

`helpdesk` owns ticket numbering, lookup verification, status and priority transitions, comment threading,
and who may see the queue. `helpdesk/HELPDESK.md` in the backend repo is the fuller description.
