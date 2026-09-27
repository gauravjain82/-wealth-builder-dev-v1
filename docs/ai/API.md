# AI — API

| | |
|---|---|
| **Module** | `ai` |
| **Source** | `src/features/ai/services/ai-chat-service.ts` |
| **Routes** | none |
| **Backend module** | `ai` → `mlm_platform/docs/ai/API.md` |
| **API prefix** | `/api/ai/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed.

## 1. Conventions

One deliberate difference from every other module: **the auth header is optional.**

```ts
...(token ? { Authorization: `Token ${token}` } : {})
```

Most services throw when the token is missing ([events](../events/API.md#1-conventions),
[matchup](../matchup/API.md#1-conventions)); this one sends the request anyway. The widget is mounted by the
layout and may render in a moment where the session is not yet established, and a chat that throws would be
worse than one that answers anonymously.

## 2. Endpoints consumed

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ai/chat` | send a message with the current page; returns the reply |
| POST | `/api/ai/chat/clear` | clear the conversation |

Note neither path has a trailing slash, unlike the rest of the app
([platform API §1](../platform/API.md#1-conventions)).

## 3. Payload types

| Type | Fields |
|---|---|
| `AIChatResponse` | `assistantMessage`, `shouldShowBooking`, `metadata` |

`shouldShowBooking` is a **server** decision — the assistant decides when to offer booking, and the widget
renders the prompt. `metadata` is `Record<string, unknown>`, so anything the backend adds arrives without a
client change.

## 4. Query parameters

None. Both endpoints take a body.

## 5. Error codes and handling

No typed errors. `parseError` reads the response **as text** rather than JSON, falling back to a supplied
default — appropriate here, since a model-backed endpoint may fail in ways that do not produce JSON.

## 6. Backend ownership

`ai` owns the model, the prompt, the conversation history keyed by session id, and the decision to offer
booking.

**The session id is the client's contribution**, and it is worth understanding: a UUID generated in the
browser and stored in `localStorage['wb.aiChatSessionId']`, created on first use with a `crypto.randomUUID`
fallback. So a conversation is scoped to **a browser, not a user** — clearing site data starts a new
conversation, and the same person on two devices has two. The read is unguarded, so a private window with
blocked storage would throw.
