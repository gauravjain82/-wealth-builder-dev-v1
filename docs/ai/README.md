# AI — Overview

| | |
|---|---|
| **Module** | `ai` |
| **Source** | `src/features/ai/` |
| **Routes** | **none** — an embedded chat mounted on every authenticated page |
| **Backend module** | `ai` → `mlm_platform/docs/ai/` |
| **API prefix** | `/api/ai/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Doc tier** | **Lite** — `README.md` + [API.md](API.md) |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Purpose

An expandable chat assistant, mounted by `MainLayout` so it is present on **every authenticated page**. It
takes a message plus the current page and returns an assistant reply, optionally prompting the user to book
an appointment.

Two files, 303 lines — the smallest module with a live backend.

## 2. Scope

**In scope** — the chat widget, sending a message with page context, clearing the conversation, and the
client-side session id.

**Out of scope** — the model, the prompting and the conversation history, all backend. Booking, which is
[matchup](../matchup/)'s.

## 3. At a glance

| | |
|---|---|
| Routes | 0 — mounted in `MainLayout` |
| Components | 1 |
| Services | 1 |
| Endpoints consumed | 2 |
| LOC (ts/tsx) | 303 |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Session id** | A client-generated UUID in `localStorage`, tying messages into one conversation. |
| **Current page** | Sent with each message so the assistant knows where the user is. |
| **`shouldShowBooking`** | A server flag telling the widget to offer booking. |

## 5. Dependencies

**Upstream** — React only.

**Downstream** — `src/shared/layouts/main-layout.tsx:29`, which mounts `ExpandableChat` for every
authenticated page.

**Backend** — `ai`.

## 6. Document map

Lite tier: this file plus [API.md](API.md), which carries the two endpoints and the session model.

## 7. Where to start reading

`services/ai-chat-service.ts` — the session id, the headers, and both endpoints, in the first forty lines.
