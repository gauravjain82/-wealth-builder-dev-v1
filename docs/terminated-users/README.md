# Terminated Users — Overview

| | |
|---|---|
| **Module** | `terminated-users` |
| **Source** | `src/features/terminated-users/` |
| **Routes** | `/terminated-users` |
| **Backend module** | `accounts` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [API.md](API.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

A list of terminated accounts — who has left, when, and their details. A record-keeping surface for
compliance and for answering "what happened to this person".

Two files, 529 lines.

## 2. Scope

**In scope** — listing terminated users, with search and detail.

**Out of scope** — **terminating somebody**, which is [team](../team/)'s
`TrackerUserProfileModal` (the editable profile modal that can terminate a user, and the reason
[team](../team/PHASES.md#3-decision-log) decision T7 keeps it away from BPM's guest lists). Also
reinstatement, which is a backend action.

## 3. At a glance

| | |
|---|---|
| Routes | 1 |
| Pages | 1 |
| Services | 1 |
| Endpoints consumed | 2 |
| LOC (ts/tsx) | 529 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Terminated** | An account ended. The record is kept, not deleted. |
| **Termination date** | When it happened. |

## 5. Dependencies

**Upstream** — `src/shared/components/ui/`.

**Downstream** — `src/router/index.tsx`, one route.

**Backend** — `accounts`.

## 6. Document map

Lite tier: this file plus [API.md](API.md).

## 7. Where to start reading

`services/terminated-users-service.ts` — both endpoints, and what a terminated record carries.
