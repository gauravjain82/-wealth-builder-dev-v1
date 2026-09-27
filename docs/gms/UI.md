# GMS — UI

| | |
|---|---|
| **Module** | `gms` |
| **Source** | `src/features/gms/components/`, `pages/`, `gms.css` |
| **Routes** | `/admin/guidance` + an embeddable `HelpAction` |
| **Backend module** | `gms` |
| **API prefix** | `/api/gms/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Routes and entry points

| Entry point | Guard | Component |
|---|---|---|
| `/admin/guidance` | `GuidanceRoute` (`can_author`) | `GuidanceAdminPage` |
| **Any tool page** | `can_view` (returns `null` without it) | `<HelpAction toolKey="bpm" />` |

`HelpAction` is the real entry point. A tool mounts it unconditionally; it renders **only** where
there is a tool to help with and the user holds `gms:read`. It is **not global chrome looking for
something to say**.

Currently mounted by `bpm` only.

## 2. Screens

### 2.1 Help action — `components/help-action.tsx`

A labelled top-right control, **wrapped in an error boundary**. If anything inside throws, the button
disappears and the page carries on — the correct outcome for a help feature and the wrong one for
almost anything else.

### 2.2 Help drawer — `components/help-drawer.tsx`

Three lists, in this order:

1. **Walk Me Through It** — authorized task choices
2. Reference
3. Troubleshooting

Four rules, all of them about restraint:

- **Nothing is highlighted as a suggestion.** Ordering is not a ranking.
- **Nothing is opened for the user.** The drawer opens on a *list*, not on content.
- **The server decides what is in the lists.** The client does not filter or rank.
- **Nothing from unrelated tools or unauthorized actions appears.**

Portalled to `document.body`, because a tool page may sit inside a clipped scrolling container and a
drawer respecting that would be cut off.

### 2.3 Pre-start panel — `components/walkthrough-start-panel.tsx`

Purpose, estimated effort, prerequisites, the automatically checked results, the live-data notice, and
Start. Three things are easy to get subtly wrong and are handled explicitly:

| Case | Behaviour |
|---|---|
| **Hard prerequisite failed** | Start is **disabled, not hidden**, with the resolution beside it. Hiding it would leave somebody wondering whether the feature is broken |
| **Hard prerequisite unverifiable** | also blocks, and says it **could not be checked** rather than implying failure. "We could not verify that you may do this" is not permission, and not an accusation either |
| **Recommended preparation** | never blocks; where the host cannot check it, the panel says so rather than showing a tick nobody earned |

**The live-data notice is not boilerplate.** Saving in the BPM pilot creates a real prospect, writes a
real note and sends a real invitation email, so the warning names *that* instead of "records are
updated".

### 2.4 Walkthrough overlay — `components/walkthrough-overlay.tsx`

A spotlight on a real control and a panel beside it. Four rules:

- **The spotlight never blocks the control.** `pointer-events: none` on the ring and no full-screen
  click-catcher — the user is operating the live tool *through* this, and an overlay that swallowed the
  click would make the walkthrough impossible to finish.
- **A satisfied step shows "Already complete" and offers Next or End.** It does not advance itself.
  Rushing forward is exactly what a well-meaning auto-advance would do.
- **Exit warns when unsaved tool data may be lost**, and says plainly that saved work stays saved.
  Those are different things, and conflating them would frighten people out of finishing.
- **It never traps the user.** End is always reachable, Escape works, and the panel is positioned away
  from the spotlight rather than over it.

### 2.5 Content blocks — `components/content-blocks.tsx`

A closed block set: heading, paragraph, list, note, link, `metric_note`. **None carries HTML**, so
nothing calls `dangerouslySetInnerHTML` — with no HTML in the data there is no sanitiser to configure
and no XSS surface to get wrong.

`metric_note` renders text the **server** resolved from the host service that owns it, so the Help says
exactly what the contest tier editor says about `BR`, `BP` and `LIC` — not a copy that drifts the next
time somebody edits one. When the reference cannot be resolved it **says so**, rather than rendering an
empty box that looks like a design mistake.

### 2.6 Guidance admin — `pages/guidance-admin-page.tsx`

The library, the review queue, the change note, a content preview, and the lifecycle actions. This is
**deliberately less** than a full management interface (decision G11): enough to get imported content
live.

Two things it does carefully:

- **The change note is shown before the content.** For the imported SOPs it is the whole point — it
  lists the host corrections applied on import, and an approver who has not read it is approving a diff
  they have not seen.
- **A 409 offers Reload, never a retry.** The button says so.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Absent | `gms_enabled` false, or no `can_view` | **nothing** — no button, no trace |
| GMS threw | an error inside `HelpAction` | the button vanishes; the tool is unaffected |
| Drawer open | Help pressed | three lists, nothing preselected |
| Walkthrough unavailable | `available: false` | listed with its `reason`, not hidden |
| Hard prerequisite failed | `outcome: 'fail'`, `blocks_start` | Start disabled with the resolution |
| Prerequisite unverifiable | `outcome: 'unavailable'` | blocks, and says it could not be checked |
| Resumable | `progress` present | offers resume or restart |
| Step satisfied | `already_complete` | "Already complete" plus Next / End — no auto-advance |
| Signal refused | server refused | `onRefused(code, detail)`; the step does not advance |
| Network failure on a signal | fetch rejected | the walkthrough **stalls** on the step, deliberately |
| Progress expired | 30 days | `progress_expired`; restart is available |
| Preview | `is_preview` | no XP, no completion — **saved actions are still real** |
| Already awarded | `already_awarded` | completion without new XP |
| Metric note unresolvable | `unavailable: true` | an explicit "unavailable" line |
| Edit conflict | 409 | a message and **Reload** |

## 4. Interaction rules

- **Never auto-advance a satisfied step.** Offer Next or End.
- **Never block the spotlighted control.**
- **Never trap the user.** End and Escape always work.
- **Never recommend, highlight or auto-open** a topic.
- **Distinguish "unsaved tool data may be lost" from "saved work stays saved"** in the exit warning.
- **Distinguish failed from unverifiable** in prerequisites.
- **Render `already_complete` from the server**; never decide it locally.
- **Show the change note before the content** when approving.
- **A 409 reloads.**
- **Stall rather than advance** when a signal was not confirmed.

## 5. Responsive and print behaviour

The drawer and overlay portal to `document.body` and take their size from the viewport rather than a
host container. `gms.css` follows the containment contract `contests.css` documents — three rules plus
`overscroll-behavior: contain`, so a scroll reaching the end of the drawer does not chain to the tool
underneath.

The overlay positions its panel away from the spotlight, which is the responsive problem unique to this
module: the target can be anywhere.

No print styles. *Not applicable.*

## 6. Accessibility

- **`HelpAction` is a labelled control**, not an icon.
- The drawer and overlay are portalled, so they are not trapped inside a clipped ancestor.
- **End is always reachable and Escape works** — the overlay never traps focus in a way the user cannot
  leave.
- Disabled Start says **why**, next to the control.
- Content blocks are semantic elements with no HTML injection.

Not covered: the spotlight is a visual affordance with no non-visual equivalent, so a screen-reader user
gets the instruction text but not the "look here" cue. That is the module's main accessibility gap and
it is inherent to the pattern rather than an oversight in the markup.

## 7. Styling and theming

One stylesheet, `gms.css`, 359 lines, **every selector under `wb-gms-`**. Nothing is global, so a Help
drawer cannot restyle the host tool it is sitting on top of — the convention `leaderboards.css` and
`contests.css` established.

GMS adds **no wrapper element** to a host component. `gmsTarget` returns a single
`data-gms-target` attribute to spread onto an element that already exists. That is the difference
between "add a stable attribute" and "extend an existing component", which decision G9 keeps out of
this package.
