# GMS — API

| | |
|---|---|
| **Module** | `gms` |
| **Source** | `src/features/gms/services/` |
| **Routes** | `/admin/guidance` + `HelpAction` |
| **Backend module** | `gms` → `mlm_platform/docs/gms/API.md` |
| **API prefix** | `/api/gms/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Endpoints **consumed**, not exposed.

## 1. Conventions

Platform conventions ([platform API §1](../platform/API.md#1-conventions)), with one deliberate
exception that is the whole point of the module.

| | |
|---|---|
| Base | `${VITE_API_BASE_URL}/api/gms` |
| Auth | `Authorization: Token <localStorage['wb.authToken']>` |
| Reads | `getJson`, with `AbortSignal` |
| Writes | `postJson` |
| Errors | `{code, detail}`, 12 stable codes |
| **`emit`** | **fire-and-forget: no React Query, returns `void`, never throws** |

`emit` is outside every convention on purpose. It is called mid-interaction by a host tool, so it must
not participate in anyone's loading state, must not surface an error to the person saving, and must
certainly not prevent the save.

## 2. Endpoints consumed

Fourteen.

### Reader surfaces

| Method | Path | Service function | Hook |
|---|---|---|---|
| GET | `/my-access/` | `fetchGmsAccess` | `useGmsAccess` |
| GET | `/context/` | `fetchHelpContext` | `useHelpContext` |
| GET | `/topics/{tool}/{topic}/` | `fetchTopic` | `useTopic` |
| GET | `/walkthroughs/{tool}/{topic}/` | `fetchWalkthrough` | `useWalkthrough` |

### Walkthrough lifecycle

| Method | Path | Service function |
|---|---|---|
| POST | `/walkthroughs/{tool}/{topic}/start/` | `startWalkthrough` |
| POST | `/walkthroughs/{tool}/{topic}/restart/` | `restartWalkthrough` |
| POST | `/walkthroughs/{tool}/{topic}/end/` | `endWalkthrough` |
| POST | `/walkthroughs/{tool}/{topic}/complete/` | `completeWalkthrough` |
| PUT | `/walkthroughs/{tool}/{topic}/feedback/` | `saveFeedback` |
| **POST** | **`/walkthroughs/{tool}/{topic}/progress/`** | **`emit`, from the adapter** |

### Management

| Method | Path | Service function |
|---|---|---|
| GET | `/manage/topics/` | `fetchLibrary` |
| POST | `/manage/revisions/{id}/{action}/` | `transitionRevision` |
| POST | `/manage/revisions/{id}/publish/` | `publishRevision` |
| POST | `/manage/topics/{tool}/{topic}/rollback/` | `rollbackTopic` |

`/context/` returns **three ordered lists and no recommendation** — walkthroughs, reference,
troubleshooting (`types/index.ts:89`). There is deliberately no "suggested" field for a client to
surface.

## 3. Payload types

`types/index.ts` (213 lines). One type matters more than the rest.

### `AdapterSignal` — the privacy boundary

```ts
interface AdapterSignal {
  event_uuid: string;
  tool_key: string;
  target_key: string;
  signal: GmsSignal;
  occurred_at?: string;
}
```

**Five fields. No index signature. No metadata field.** Adding one widens the privacy boundary, and the
backend rejects unknown keys anyway, so a change fails loudly at runtime *and* in review — and breaks a
compile-time assertion in `services/gms-adapter.contract.ts`.

`GmsSignal` is a closed seven-word union: `opened`, `closed`, `selected`, `valid`, `invalid`, `saved`,
`failed`. That is the entire vocabulary a tool has for describing what happened.

### The rest

| Type | Note |
|---|---|
| `GmsAccess` | eight capability flags, including `gms_enabled` as a kill switch |
| `ContentBlock` | a **closed union**; no variant carries HTML |
| `ContentBlock.metric_note.resolved` | resolved **server-side** from the owning host service (G6). The client has no stored copy to fall back on — which is exactly what stops the Help drifting from the screen |
| `TopicSummary` / `TopicContent` | a Help entry, and its published content |
| `HelpContext` | three lists, no recommendation |
| `Prerequisite` | `requirement_level: hard \| recommended`, `outcome: pass \| fail \| unavailable`, `blocks_start` |
| `WalkthroughProgress` | **identifiers and state only — never a form value** |
| `WalkthroughStepState` | `already_complete` is a **server** answer; `offers: ['next','end']` is a choice, never an auto-advance |
| `WalkthroughDetail` | the pre-start payload, including `live_data_notice` |
| `CompletionResult` | `xp_earned`, `preview`, `already` |
| `RevisionEditorPayload` | carries `revision` — **"a missing one is a conflict, never consent"** |
| `LibraryRow` | one library / review-queue row |

`Prerequisite.outcome` having three values rather than two is load-bearing: `unavailable` is not
`fail`, and the UI must say "could not be checked" rather than implying a failure.

## 4. Query parameters

| Parameter | Where |
|---|---|
| `tool`, `location` | `/context/` — location narrows relevance |
| path segments `{tool}`, `{topic}` | everything walkthrough-related |
| `step_key` | added to the `emit` body alongside the envelope |
| library filters | `/manage/topics/` |

`emit` sends the five-field envelope **plus `step_key`**, which comes from the attached target rather
than from the caller — the tool cannot say which step it thinks it is on.

## 5. Error codes and handling

Twelve stable codes (`types/index.ts:170`).

| Code | Meaning | Client behaviour |
|---|---|---|
| `unauthenticated`, `forbidden`, `not_found` | the usual | surfaced |
| `invalid_input` | rejected body | the adapter's default `onRefused` code |
| **`edit_conflict`** | somebody else saved first | **Reload, never retry** |
| `prerequisite_failed` | a hard prerequisite blocks | the start panel already showed why |
| `walkthrough_incompatible` | targets missing from the registered build | **the walkthrough was auto-disabled** — see [OPERATIONS.md](OPERATIONS.md#6-troubleshooting) |
| `walkthrough_disabled` | disabled by an author or by incompatibility | listed with a reason, not hidden |
| `signal_not_allowed` | wrong signal for this step, or an unregistered target | the step does not advance |
| `progress_expired` | unfinished for 30 days | restart is offered |
| `already_completed` | a repeat completion | no new XP; not an error to the user |
| `bootstrap_disable_forbidden` | protecting the bootstrap administrator | surfaced in administration |

A **network** failure on `emit` is different from a refusal: the walkthrough stalls on the step. That is
correct — the alternative is advancing on an action the server never confirmed.

## 6. Backend ownership

`gms` owns, and the client must not recompute:

- **Which topics are relevant**, and their order. Three lists, server-decided.
- **Prerequisite evaluation**, live against permissions and current tool state — including the
  three-valued outcome.
- **`already_complete`** for a step, against live host state.
- **Whether a signal is allowed** for a step, and whether a target is registered.
- **Target registration and compatibility.** Registration is authoritative; a published walkthrough
  whose targets have gone is **disabled and its managers notified**.
- **Progress lifetime** — per user, across devices, expiring after 30 days.
- **XP**, awarded once per published walkthrough version, via a shared XP service (G2).
- **`metric_note` resolution** from the host service that owns the words (G6).
- **Revision lifecycle and concurrency.**
- **Rejecting unknown envelope fields** — the server half of the privacy boundary.

The client owns the drawer's presentation, the spotlight, the exit warning, and calling `emit` at the
right moment.

**What the client must never send.** Anything about tool data. Not a form value, not a server response,
not a saved record. The signature makes that unrepresentable
([ARCHITECTURE.md §3.1](ARCHITECTURE.md#31-the-adapter-boundary--the-thing-to-understand-first)), and
`services/gms-adapter.contract.ts` fails the build if it stops being so.
