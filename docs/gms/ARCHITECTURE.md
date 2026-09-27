# GMS — Architecture

| | |
|---|---|
| **Module** | `gms` |
| **Source** | `src/features/gms/` |
| **Routes** | `/admin/guidance` + an embeddable `HelpAction` |
| **Backend module** | `gms` |
| **API prefix** | `/api/gms/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Layering

Standard layering plus one file with no parallel anywhere else in the app:
`services/gms-adapter.contract.ts`, which contains **no runtime code at all** and exists purely to be
type-checked.

| Layer | File | Owns |
|---|---|---|
| Types | `types/index.ts` (213) | the contract; `AdapterSignal` is the privacy boundary |
| Adapter | `services/gms-adapter.ts` (139) | `emit`, `gmsTarget`, attach/detach |
| **Contract** | `services/gms-adapter.contract.ts` (66) | **compile-time assertions that the boundary has not widened** |
| Service | `services/gms-service.ts` (248) | the 14 endpoints |
| Hooks | `hooks/use-gms.ts` (119) | queries and mutations |
| Components | `components/` (5) | Help action, drawer, start panel, overlay, content blocks |
| Page | `pages/guidance-admin-page.tsx` (279) | library and review queue |
| Manifest | `src/features/<tool>/gms-targets.ts` | **in the tool**, not here |

`index.ts` exports exactly five things — `HelpAction`, `emit`, `gmsTarget`, `isAdapterAttached`,
`useGmsAccess`, plus two types. The drawer, overlay, services and runtime state are all internal, so
a tool **cannot reach past the adapter boundary even by importing something it should not**.

## 2. Component map

```
any tool page
  └── <HelpAction toolKey="bpm" />          ← the only thing a tool mounts
       │  (error boundary; renders null without gms:read)
       ├── HelpDrawer                        portal → document.body
       │    ├── walkthroughs  ─┐
       │    ├── reference      ├─ three ordered lists, no recommendation
       │    ├── troubleshooting┘
       │    └── ContentBlocks   closed block set, never HTML
       ├── WalkthroughStartPanel  prerequisites · live-data notice · Start
       └── WalkthroughOverlay     portal; spotlight + step panel
            └── attachAdapter / detachAdapter

a tool's own components
  └── <button {...gmsTarget(BPM_TARGETS.addGuestSave)} onClick={save}>
      ...                       emit('bpm.add_guest.save', 'saved')

/admin/guidance ── GuidanceRoute (can_author) ── GuidanceAdminPage

build time: vite-plugin-gms-manifest
  └── imports src/features/bpm/gms-targets.ts → build/gms-targets.bpm.json
```

## 3. Primary flows

### 3.1 The adapter boundary — the thing to understand first

A host tool says *that* something happened to a registered control. It never says what the user
typed, what the server returned, or what was saved.

```ts
emit(targetKey: string, signal: GmsSignal): void
```

**Enforcement is the signature, not a convention.** There is no third parameter, so a payload is
*unrepresentable* rather than forbidden. The envelope is five fields, typed as a closed interface with
no index signature (`types/index.ts:28`). The backend rejects unknown fields too, so **both halves
have to be dismantled** for a leak.

One host fact makes this credible rather than aspirational: BPM's own Add Guest success hook is
already `onAdded: () => void`. The response carrying the guest's name, phone and email never reaches
the callback the adapter listens to.

`emit` returns `void` and **never throws**. A tool calls it in the middle of its own work; a failure
to tell GMS about a save must never surface to the person saving, and must certainly never prevent it.

### 3.2 How the boundary is tested without a test runner

`services/gms-adapter.contract.ts` asserts, at compile time, that:

1. `AdapterSignal` has **exactly** those five keys;
2. `emit`'s parameters are exactly `[string, GmsSignal]`, and its `length` is exactly 2;
3. `emit` returns `void` — a return value would be a second channel;
4. `GmsSignal` is a closed seven-word union.

Each fails `tsc` if the boundary widens, and `npm run build` runs `tsc` first, so this runs in CI.
Widening the privacy boundary is therefore not possible without **deleting an assertion that says so**.

The file is explicit about its own limits: it cannot assert runtime behaviour. That half lives in the
backend suite (`gms/tests/test_adapter_boundary.py`), which includes the end-to-end "no fragment of a
guest's name, phone or email reached a stored event" assertion.

### 3.3 Running a walkthrough

1. `HelpAction` fetches the Help context for its tool and shows the drawer.
2. Choosing a walkthrough opens `WalkthroughStartPanel`, which lists prerequisites **already
   evaluated server-side** against live permissions and tool state.
3. Start posts to `/walkthroughs/{tool}/{topic}/start/` and returns resumable progress.
4. `WalkthroughOverlay` mounts, calls `attachAdapter` with the tool, topic, step and two callbacks.
5. The user operates the **real tool**. A control calls `emit`; the adapter posts the envelope to the
   progress endpoint.
6. The server accepts → `onAccepted()` and the overlay advances. Refuses → `onRefused(code, detail)`.
7. `detachAdapter` on unmount, so a stale overlay cannot receive signals.

**A network failure stalls the step, deliberately.** The alternative is advancing on an action the
server never confirmed (`services/gms-adapter.ts:120`).

### 3.4 Targets, and why they are declared in the tool

`BPM_TARGETS` lives in `src/features/bpm/gms-targets.ts`, not in the backend, so **the keys that exist
in code are the keys that exist** — deleting an instrumented component is a `tsc` error rather than a
walkthrough silently pointing at nothing.

`vite-plugin-gms-manifest.ts` imports *the same module the components import* and emits
`build/gms-targets.bpm.json`, so the file posted and the keys rendered cannot disagree. A release step
posts it:

```
python manage.py gms_register_targets --manifest build/gms-targets.bpm.json
```

**Registration is authoritative.** A key this file stops exporting is deactivated on the next deploy,
and any published walkthrough that needed it is **disabled with its managers notified** — rather than
left pointing at a control that is gone.

The compatibility version is `<ISO date>+<short git sha>`. It must change whenever the rendered
controls could have changed; outside a git checkout the sha falls back to a timestamp, which is worse
but still monotonic — better than a constant, which would let two builds claim to be the same version.

### 3.5 Approving content

1. `/admin/guidance` lists topics and the review queue.
2. **The change note is shown before the content.** For imported SOPs it lists the host corrections
   applied on import, and an approver who has not read it is approving a diff they have not seen.
3. Transition, publish and rollback actions carry a `revision`.
4. A 409 offers **Reload**, never a retry.

## 4. Server state and caching

| Hook | Key | staleTime |
|---|---|---|
| `useGmsAccess` | `['gms','access']` | 5 min, `retry: false` |
| `useHelpContext` | `['gms','context',tool,location]` | 60 s, `enabled` on a known tool |
| `useTopic` | `['gms','topic',…]` | default |
| `useWalkthrough` | `['gms','walkthrough',…]` | **deliberately short** |

**Prerequisites are deliberately not cached for long** (`hooks/use-gms.ts:1`). They are evaluated live
against permissions and current tool state, and a pre-start panel showing a stale pass would let
somebody start a walkthrough that cannot succeed.

`emit` does **not** go through React Query. It is a fire-and-forget `fetch` with `void`, because it is
called mid-interaction by a host tool and must not participate in anyone's loading state.

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|
| Drawer open, selected topic | `HelpAction` | `useState` |
| Start-panel state | `WalkthroughStartPanel` | `useState` |
| Current step, spotlight rect | `WalkthroughOverlay` | `useState` + refs |
| **The active adapter target** | **module-level in `gms-adapter.ts`** | one `let activeTarget` |
| Library filters, selected revision | the admin page | `useState` |

`activeTarget` is module-level singleton state — the one place this app holds mutable state outside
React. It is justified by the shape of the problem: `emit` is called from arbitrary host components
that must not need a context provider, and there is only ever one running walkthrough. It is `null`
whenever none is running, which is the normal state and the reason `emit` is cheap.

## 6. Permissions and gating

`GET /api/gms/my-access/` returns eight flags (`types/index.ts:37`):

| Flag | Gates |
|---|---|
| `gms_enabled` | the whole feature — a kill switch (G12) |
| `can_view` (`gms:read`) | whether `HelpAction` renders at all |
| `can_author` (`gms:author`) | `/admin/guidance` |
| `can_review`, `can_approve`, `can_publish` | the lifecycle actions |
| `can_view_analytics`, `can_administer` | analytics and administration |

**No role holds any `gms:*`**, so the feature stays invisible until somebody is named in the access
console — the same limited-rollout shape as Home v2 and misalignments.

`HelpAction` returns `null` without `can_view`, so a tool mounting it unconditionally is safe.

## 7. Integration points

- **`gms` backend** — 14 endpoints ([API.md](API.md)).
- **`bpm`** — the pilot tool: 7 targets, and `/bpm/add-guest` is the first published walkthrough.
- **`vite-plugin-gms-manifest.ts`** — build-time manifest emission.
- **Host services that own words** — `metric_note` blocks are resolved **server-side** from the
  service that owns them (G6), so Help says exactly what the contest tier editor says about `BR`,
  `BP` and `LIC` rather than a copy that drifts.
- **A shared XP service** owns the XP total (G2); GMS records completions.

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
| **`emit` has exactly two parameters** | the signature **and** a compile-time assertion | a payload channel — a guest's email leaving the browser |
| `AdapterSignal` is exactly five fields | closed interface, no index signature, plus an assertion | the same |
| `emit` returns `void` and never throws | its body | a help feature breaking a save |
| A GMS failure cannot impair the tool | error boundary in `HelpAction` | a Help bug taking down BPM |
| With GMS absent every call is a no-op | `emit` returns immediately when nothing is attached | a tool that needs GMS present to work |
| The adapter detaches on unmount | `detachAdapter` | a stale overlay receiving signals |
| A network failure stalls the step | no optimistic advance | advancing on an action the server never confirmed |
| The spotlight never blocks its control | `pointer-events: none`; no click-catcher | a walkthrough impossible to finish |
| A satisfied step offers Next or End, never auto-advances | `offers: ['next','end']` from the server | silently rushing the user forward |
| Content blocks carry no HTML | closed union; no `dangerouslySetInnerHTML` | an XSS surface and a sanitiser to misconfigure |
| `already_complete` is a server answer | rendered, never derived | "Already complete" that is not |
| Registered keys are the rendered keys | one manifest module, imported by both | a walkthrough pointing at a control that is gone |
| A 409 reloads, never retries | the admin page | a silent overwrite |

**The one gap, stated rather than papered over.** There is **no automated test that BPM renders and
submits with GMS absent** (decision G12). The property is structural — `emit` returns immediately when
nothing is attached, and `HelpAction` returns `null` without the capability — but structural is not
asserted. `gms-adapter.contract.ts:17` records this as the one piece of the plan this package could
not deliver, and it is the first thing to fix if a test runner ever arrives.

**Containment.** `gms.css` follows the contract `contests.css` documents, because a drawer has the
same problem an embedded card does: it takes a size from its host and must scroll inside rather than
growing the page. Three rules, all required, plus `overscroll-behavior: contain` so a scroll reaching
the end does not chain to the tool underneath.
