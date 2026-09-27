# GMS — Overview

| | |
|---|---|
| **Module** | `gms` (Guidance Management System) |
| **Source** | `src/features/gms/` |
| **Routes** | `/admin/guidance` — plus a `HelpAction` any tool page can mount |
| **Backend module** | `gms` → `mlm_platform/docs/gms/` |
| **API prefix** | `/api/gms/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> **Not live.** Six `gms` migrations are unapplied and nobody holds any `gms:*` permission. The
> frontend and backend branches (`feature/wb-gms` in both repos) must merge and deploy together.
> See [OPERATIONS.md §5](OPERATIONS.md#5-deployment).

## 1. Purpose

GMS is in-app guidance: a Help drawer that shows what is relevant *here*, and **walkthroughs** that
guide someone through a real task in the real tool — a spotlight on an actual control, advancing as
they use it.

Two properties make it unusual, and both are structural rather than stylistic:

- **It is a guest in someone else's page.** A tool mounts `HelpAction` and GMS does the rest, but a
  GMS failure must never impair the tool underneath. The Help button is inside an error boundary; if
  anything throws, the button disappears and the page carries on.
- **It learns that something happened, never what.** A host tool emits `emit(targetKey, signal)` —
  a stable control key and one of seven allow-listed words. There is **no third parameter**, so a
  payload is not forbidden but *unrepresentable*. GMS cannot learn a guest's name, phone or email by
  carelessness, only by someone deliberately widening the boundary.

Walkthroughs run against **live data**. Saving in the BPM pilot creates a real prospect, writes a
real note and sends a real invitation email — so the pre-start panel says exactly that rather than
"records are updated".

## 2. Scope

**In scope**
- `HelpAction`: the labelled Help control, its error boundary, and the surfaces it owns.
- The Help drawer: walkthroughs first, then reference, then troubleshooting.
- The pre-start panel: purpose, effort, prerequisites with automatic verification, live-data notice.
- The walkthrough overlay: spotlight, step panel, Next/End, exit warning.
- The adapter boundary: `emit`, `gmsTarget`, and compile-time assertions about both.
- Per-tool stable-target manifests, emitted at build time.
- The guidance library and review queue at `/admin/guidance`.

**Explicitly out of scope**
- **A structured content editor, a step builder, permissions and feedback screens.** The admin page
  is deliberately the subset needed to get imported content live (decision G11).
- **Automated recommendations.** The drawer lists; it never suggests, highlights or auto-opens.
- **Navigating to unrelated tools.** GMS may navigate within the current tool and its own modals.
- **XP accounting.** A shared XP service owns the total (G2); GMS records completions.
- **Any knowledge of tool data.** See §1.

## 3. At a glance

| | |
|---|---|
| Routes | 1, plus an embeddable control |
| Pages | 1 |
| Components | 5 |
| Hooks | 1 file |
| Services | 2 + **1 compile-time contract file** |
| Endpoints consumed | 14 |
| Public exports | 5 — deliberately minimal |
| LOC (ts/tsx) | 2,007 |
| CSS | 359 lines, all under `wb-gms-` |
| Instrumented tools | 1 (`bpm`, 7 targets) |
| Doc tier | Full |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| **Tool** | A host feature GMS can help with, identified by a `tool_key` such as `bpm`. |
| **Topic** | One unit of guidance: a walkthrough, a reference page or a troubleshooting page. |
| **Walkthrough** | A guided sequence of steps performed in the live tool. |
| **Step** | One instruction, bound to a target and a completion signal. |
| **Target** | A stable, registered control key. Declared in the tool's `gms-targets.ts`. |
| **Signal** | One of seven allow-listed observations: `opened`, `closed`, `selected`, `valid`, `invalid`, `saved`, `failed`. |
| **Adapter** | The `emit` / `gmsTarget` boundary between a tool and GMS. |
| **Prerequisite** | A condition checked before a walkthrough starts. `hard` blocks; `recommended` informs. |
| **Compatibility version** | `<ISO date>+<git sha>` identifying which build's controls were registered. |
| **Revision** | One version of a topic's content, with its own lifecycle and concurrency token. |
| **Preview mode** | Running a walkthrough without earning XP. **Saved actions are still real.** |
| **Bootstrap administrator** | A host-configured protected admin account. |

## 5. Dependencies

**Upstream**
- React and `react-dom` (`createPortal`) only. **No shared UI components** — the drawer and overlay
  portal themselves, because a tool page may be inside a clipped scrolling container.

**Downstream**
- `src/features/bpm/gms-targets.ts` — the only instrumented tool.
- `vite-plugin-gms-manifest.ts` — imports that manifest and emits JSON at build time.
- `src/router/guidance-route.tsx` — the guard.
- `src/hooks/use-role-based-menu.ts` — the menu entry.

**Backend** — `gms`, 14 endpoints.

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **Before touching the adapter.** The privacy boundary and how it is enforced. |
| [UI.md](UI.md) | Changing the drawer, the overlay or the pre-start panel. |
| [API.md](API.md) | The 14 endpoints and the signal envelope. |
| [OPERATIONS.md](OPERATIONS.md) | Deploying, registering targets, or a disabled walkthrough. |
| [PHASES.md](PHASES.md) | **Before changing any behaviour.** Decisions G1–G12 plus 24 owner decisions, two taken against the recommendation. |

## 7. Where to start reading

1. `services/gms-adapter.ts` — the boundary, in 139 lines. Everything else follows from it.
2. `services/gms-adapter.contract.ts` — **compile-time assertions** that the boundary has not
   widened. Unusual and worth understanding: this repo has no test runner, so `tsc` is the
   enforcement.
3. `types/index.ts:21` — `AdapterSignal`: five fields, closed, no index signature.
4. `src/features/bpm/gms-targets.ts` — what an instrumented tool looks like.
5. `components/walkthrough-overlay.tsx` — the four rules a running walkthrough must honour.
