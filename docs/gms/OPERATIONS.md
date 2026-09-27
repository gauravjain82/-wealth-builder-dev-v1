# GMS — Operations

| | |
|---|---|
| **Module** | `gms` |
| **Source** | `src/features/gms/`, `vite-plugin-gms-manifest.ts` |
| **Routes** | `/admin/guidance` + `HelpAction` |
| **Backend module** | `gms` |
| **API prefix** | `/api/gms/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> **Not live.** Six `gms` migrations unapplied, nobody granted any `gms:*`. Coupled to
> `feature/wb-gms` on the backend.

## 1. Environment and configuration

No module-specific `VITE_` variables. Configuration is backend state:

| Setting | Where | Effect |
|---|---|---|
| `GMS_ENABLED` | backend | the kill switch. Surfaces as `gms_enabled` and turns the whole feature off (G12) |
| `gms:read` / `:author` / `:review` / `:approve` / `:publish` / `:administer` | access console | who sees Help, who authors, who publishes |
| Registered targets + compatibility version | `gms_register_targets` | which controls a walkthrough may point at |
| Topics and revisions | `/admin/guidance` | the content itself |
| Bootstrap administrator | host-configured | a protected admin account. **The address is deliberately not scattered through application logic** |

## 2. Build and run

Standard ([platform OPERATIONS §2](../platform/OPERATIONS.md#2-build-and-run)), plus one step unique to
this module.

**`vite-plugin-gms-manifest.ts` runs on every build** and emits one JSON manifest per instrumented
tool. A successful build prints what it wrote:

```
[gms] wrote build/gms-targets.bpm.json (7 targets, version 2026-09-27+7e3b7f1)
```

The manifest is imported from **the same module the components import**, so the file posted and the keys
rendered cannot disagree. The compatibility version is `<ISO date>+<short git sha>`; outside a git
checkout the sha falls back to a timestamp — worse, but still monotonic, where a constant would let two
builds claim to be the same version.

`tsc` is part of `npm run build`, which matters more here than elsewhere: it is what runs the
boundary assertions in `services/gms-adapter.contract.ts`.

## 3. Feature flags and rollout

Two layers, and the first is a real kill switch:

| Layer | Effect when off |
|---|---|
| `GMS_ENABLED` | the entire feature disappears — no button, no trace |
| `gms:read` | `HelpAction` returns `null` for that user |
| `gms:author` | `/admin/guidance` redirects |

**No role holds any `gms:*`**, so the feature stays invisible until someone is named in the access
console — the same limited-rollout shape as Home v2 and misalignments.

**BPM is the first and only instrumented tool.** Add Guest is the first published walkthrough; the rest
of BPM's workflows ship as **drafts** deliberately (G11), so publishing them is an operator action, not
a release.

## 4. Tests and checks

**This module is the app's one exception to "no automated tests".** Not a test runner — there still is
none — but `services/gms-adapter.contract.ts` contains four compile-time assertions that fail `tsc` if
the privacy boundary widens, and `tsc` runs in CI on every build. Widening the boundary requires
deleting an assertion that says so.

What it cannot do is assert runtime behaviour. That half is in the backend suite,
`gms/tests/test_adapter_boundary.py`, which includes the end-to-end "no fragment of a guest's name,
phone or email reached a stored event" assertion.

`npm run lint` reports nothing in this module.

Manual checks:

1. **GMS absent.** With `GMS_ENABLED` off — or `gms:read` ungranted — confirm BPM's Add Guest renders
   and submits **exactly as before**, with no Help button. This is the check for the one gap this module
   knowingly has (G12).
2. **GMS broken.** Force an error inside `HelpAction` and confirm the button vanishes while the tool
   carries on.
3. **The boundary.** Watch the network tab during a walkthrough: every `progress/` POST should carry
   five envelope fields plus `step_key`, and **nothing else**. No form values, no names, no emails.
4. **Spotlight usability.** Confirm the spotlighted control is still clickable through the overlay.
5. **A satisfied step** shows "Already complete" and waits for Next or End.
6. **Exit warning** distinguishes unsaved tool data from saved work.
7. **Prerequisites** — a failed hard one disables Start with a reason; an unverifiable one says it could
   not be checked rather than implying failure.
8. **Stall on network failure** — drop the connection mid-step and confirm the walkthrough waits rather
   than advancing.
9. **Target removal.** Delete an instrumented component and confirm `tsc` fails.
10. **Approval flow** — the change note appears **before** the content; a 409 offers Reload.

## 5. Deployment

**Coupled.** `feature/wb-gms` exists in both repos and must merge and deploy together, like Packages
1–3. Merging the frontend alone gives a Help button whose every call fails.

Sequence — steps 1, 2 and 5 are backend or operator actions and **none should be run unprompted**:

1. **Apply the six `gms` migrations.** Verify with `showmigrations gms` on the target environment, never
   from a document.
2. **Seed the `gms:*` permissions** in `authz`.
3. **Deploy this frontend** (`npm run build`, `firebase deploy --only hosting`).
4. **Register the targets** from the build that was just deployed:
   ```
   python manage.py gms_register_targets --manifest build/gms-targets.bpm.json
   ```
   **Order matters.** Registration is authoritative and is checked against what the deployed build
   renders, so registering a manifest from a different build disables walkthroughs that are in fact
   fine.
5. **Grant `gms:read`** to the pilot group and `gms:author` to whoever approves content.
6. **Approve and publish** the Add Guest walkthrough at `/admin/guidance`. The imported SOPs arrive as
   corrected drafts and need a human approval — read the change note first; it lists the corrections
   applied on import.

**Every deploy needs step 4 again.** A build whose targets changed must re-register, or published
walkthroughs referencing a removed control stay pointed at something that is gone. Conversely, a
re-registration that drops a key **disables** the walkthroughs needing it and notifies their managers —
which is the designed behaviour, not a failure.

Rollback is revoking `gms:read`, or setting `GMS_ENABLED` off. No deploy required.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| No Help button anywhere | `GMS_ENABLED` off, or no `gms:read` | `/api/gms/my-access/`. Absence is the designed default |
| The button appeared, then vanished | something threw inside `HelpAction` | the console. The error boundary did its job; the tool is unaffected |
| `/admin/guidance` redirects | no `gms:author` | the same payload's `can_author` |
| A walkthrough is listed as unavailable | its `reason` says why | expected — unavailable walkthroughs are **listed with a reason**, not hidden |
| **A published walkthrough is suddenly disabled** | its targets are missing from the newly registered compatibility version | the `disabled_reason`, then whether step 4 was run against the deployed build. Managers are notified by design |
| `signal_not_allowed` | wrong signal for the step, or an unregistered target | the target key against `gms-targets.ts` and the registered manifest |
| A step will not advance after the right action | the signal was refused, or the network failed | refused → `onRefused` reports a code; a network failure **stalls deliberately** |
| The walkthrough advanced without the user acting | should be impossible — the server confirms every signal | if seen, an optimistic advance was added; remove it |
| The spotlight blocks the control | `pointer-events: none` lost, or a click-catcher added | `gms.css` and `walkthrough-overlay.tsx` |
| Scrolling the drawer scrolls the tool | `overscroll-behavior: contain` lost | `gms.css` |
| The drawer is clipped | it was rendered inline instead of portalled | the drawer must portal to `document.body` |
| Help text disagrees with the tier editor | a `metric_note` was hard-coded instead of server-resolved | `metric_note.resolved` — the client keeps no copy, by design (G6) |
| A metric note shows "unavailable" | the reference could not be resolved | expected; better than an empty box |
| Progress lost after a month | 30-day expiry | expected; restart is available |
| A completion earned no XP | a repeat, or preview mode | `already_awarded` / `is_preview`. **Preview earns nothing but its saved actions are real** |
| `tsc` fails in `gms-adapter.contract.ts` | the adapter boundary was widened | **that is the assertion working.** Do not delete it to make the build pass |
| A guest's data appears in a stored event | both halves of the boundary were dismantled | the envelope type, `emit`'s signature, and the backend's unknown-field rejection |
