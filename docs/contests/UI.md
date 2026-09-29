# Contests — UI

| | |
|---|---|
| **Module** | `contests` |
| **Source** | `src/features/contests/components/`, `pages/`, `contests.css` |
| **Routes** | `/contests`, `/admin/contest-settings`, embedded card |
| **Backend module** | `wbreporting` |
| **API prefix** | `/api/wbreporting/` |
| **Status** | Gated |
| **Doc version** | 1.0 |
| **Verified against** | commit `08eea2c` — 2026-09-29 (§2.2–§2.5, §3 and §4 re-read for parity phase 17; the rest `17121e6`) |

## 1. Routes and entry points

| Route | Guard | Component | Denied → |
|---|---|---|---|
| `/contests` | `ContestsRoute` (`can_view_contests`) | `ContestsPage` → `ContestsCard` | `/home` |
| `/admin/contest-settings` | `ContestSettingsRoute` (`can_manage`) | `ContestSettingsPage` → `ContestSettings` | **`/contests`** |

**Embedded entry point.** `ContestsCard` is mounted by `src/features/home-v2/`, replacing a
`<CanvaVideoCard title="Event & Contests">` placeholder. That is the primary placement; the route is
the optional one.

The two denial targets differ deliberately: a reader who lands on the settings URL is returned to the
card they *can* use, not to a dead end.

Neither surface reads the query string.

## 2. Screens

### 2.1 The card — `components/contests-card.tsx`

One component, two placements. `withChrome` is the only difference between the embedded and routed
renderings.

| Row | Flexibility |
|---|---|
| Header | fixed |
| Meta line (period, status) | fixed |
| Tier strip (`TierSelector`) | fixed |
| Filter summary | fixed |
| **`.wb-ct-scroll` (standings)** | **the single flexible row** |

Anyone editing this component needs §7's containment contract first. Adding a second `flex: 1` child
turns internal scrolling into page growth, silently.

### 2.2 Tier overview — `components/tier-selector.tsx`

Tier cards showing name, period, reward and — when `show_tier_overview` — the qualified / close /
in-running counts. The response carries **every** tier, with `selected` flags, and the counts are
for the whole contest: "in running" is everyone listed, the same on every card, and a selection does
not change them (C18). A tier that requires a metric with no source says "no source, counts as 0"
(C15). **The cards are also the toggles**, with the three-state gesture in
[ARCHITECTURE.md §3.3](ARCHITECTURE.md#33-tier-selection--the-three-state-gesture).

On a narrow card the row becomes a horizontally scrollable, snap-friendly strip — **inside the card,
never at page level**.

### 2.3 Filters — `components/contest-filters.tsx`

| Control | Values |
|---|---|
| Person | autocomplete (`UserAutocompleteDropdown`) |
| View | Just this person · Base shop · Super base · Super team · All. **Defaults to All** with no person, still limited to what the viewer may see (C20) |
| **Net** | labelled **"Direct reports only"** |
| Leaders | include leaders |
| Agents | include agents |

Everything is a draft until **Apply**.

**The Net label is not a style choice.** The contest `net` filter keeps the selected person plus
whoever reports directly to them. Package 2's *Net Base* is a different rule entirely, and reusing
that name here would be read as that rule (decision C10). Do not relabel it "Net" or "Net Base".

### 2.4 Standings — `components/contest-standings.tsx`

Two renderings of the same data, **both always in the DOM**, with CSS choosing one by container
width. Keeping both mounted is what makes sort and focus state identical between them.

| Rendering | Layout |
|---|---|
| Wide | a table with a sticky header **and** a sticky agent column, scrolling on both axes inside the element |
| Narrow | one card per agent, tier results stacked under the identity line |

With no tier header chosen, rows are ordered by **best %** — the highest score over the tiers open to
the agent, never below 0 — then name, and no header shows an arrow (C16). Clicking a tier header
sorts on it. Only the **selected** tiers are columns. Percentages arrive as **whole numbers** (C20);
the server qualifies and sorts on the exact value.

A row appears for anyone with activity on a selected tier, **even if every one of its cells is
blank** (C17, as on dtez).

### 2.5 The cell — `components/contest-cell.tsx`

The most consequential 111 lines in the module. A cell is one of three things:

| Cell | When |
|---|---|
| A whole-number percentage, with metric pills | eligible |
| **Blank** | **ineligible** |

A requirement with no source (`BE`, `C`) is a pill reading `0/goal`, greyed, with the reason as its
title. It counts as 0 in the percentage, so the tier cannot be qualified (C15). There is no
"cannot be measured" state any more.

**The blank is the point.** An ineligible cell renders visually empty and **never** shows the word
"Restricted" — it reads as a punishment rather than as "this tier is not for you", and a Non-License
tier blanks every licensed person by design. The accessible text carries the meaning instead, so the
cell is empty to the eye and explicit to a screen reader.

It is structural, not cosmetic: the server sends `progress: null` and an empty `metrics` array for an
ineligible cell, so there is no number here to hide by accident.

### 2.6 Dialogs — `components/contest-dialogs.tsx`

Four, all through the shared `Modal`, each opening immediately with a loading state and fetching its
own data:

| Dialog | Shows |
|---|---|
| Proof | period, requirement, actual, percent, cards, formula, source rows, Load more |
| Profile | agent identity plus recruiting and leader paths |
| Flyer | the image or PDF, via a short-lived signed URL |
| Help | how to read the board |

### 2.7 Settings — `components/contest-settings.tsx` + `tier-editor.tsx`

Contest list, then per contest: identity, status, period mode, notes, flyer, and a `TierEditor` per
tier.

`TierEditor` enforces three rules **in addition to** the server enforcing them, because a disabled
input is not validation:

- **`TR`, `TP`, `TE` are result components, never threshold inputs.** Not rendered at all; the
  backend rejects them if a hand-written request sends one.
- **An unmeasurable metric cannot be required.** `BE` and `C` have no source in this deployment; the
  input is disabled and says why.
- **Eligibility levels come from the host's level table.** All ticked and none ticked are the same
  instruction — "anyone" — because the backend stores the shorter encoding and both collapse to
  empty.

And it carries the `BR`/`BP`/`LIC` single-hop warning, at the moment somebody types a threshold.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Loading | standings in flight | a loading state in the scroll area |
| Empty | no rows for the filters | an empty body, not an error |
| **Blank cell** | `eligible: false` | a visually empty cell; meaning in the accessible text only |
| Requirement with no source | `metric.available: false` | a greyed `0/goal` pill with its reason; the tier averages it as 0 and cannot qualify (C15, amending C7) |
| Listed with only blank cells | activity on a selected tier the agent is not eligible for | a row whose cells are all blank. Deliberate (C17) |
| Team-credit note | any visible tier uses a single-hop measure | `team_credit_note` shown |
| Applied filters | always, under the tier selector | the filter summary only. Until Phase 11 it also said "N without an agent code are not in these results"; scopes now hold coded users only (C22), so the count is gone from the response and the line |
| Error | non-2xx | the backend's `detail` |
| Denied | guard false | redirect: reader → `/home`, settings → `/contests` |
| **Edit conflict** | 409 `edit_conflict` | an explicit message and **Reload** — never an automatic retry |
| Flyer expired | URL past 15 min | re-signed on reopen, by the 10-minute `staleTime` |
| Considered contest | `contest_status = considered` | settings-only; not offered to readers |

## 4. Interaction rules

- **Drafts do not alter results until Apply.**
- **An ineligible cell is blank and unlabelled.** Never reintroduce "Restricted".
- **`null` progress is never `0`.**
- **Toggling the last selected tier off returns to all tiers.**
- **Sort is server-side on exact values**; display rounding is cosmetic. No sort tier means best %.
- **Columns are the selected tiers; the cards are always every tier** (C18).
- **Dialogs open immediately**, then load. They are `enabled`-gated so opening the card fetches none
  of them.
- **A 409 offers Reload.** Do not retry a save.
- **Send the whole tier collection with `replace_tiers`**, and mark removals `pending_delete` so
  intent is explicit in the payload rather than inferred from an absence.
- **The card never sets its own height.**

## 5. Responsive and print behaviour

**Container queries, not viewport breakpoints** — `@container wb-ct-card` at 34rem
(`contests.css:537`, `:543`). The card can be narrow on a wide screen (it sits in a two-column grid)
and wide on a narrow one, so viewport width is the wrong question. One viewport media query remains at
48rem (`:558`) for page-level chrome, and `prefers-reduced-motion` is honoured (`:526`).

Scrolling is owned entirely by `.wb-ct-scroll`, on both axes. Wide standings scroll horizontally
*inside* the card — never at page level.

No print styles. *Not applicable — unlike the Full Report, a contest board is not a handout.*

## 6. Accessibility

- **The blank cell's meaning lives in accessible text.** This is the module's most important
  accessibility decision: visually empty, explicit to a screen reader.
- Tier toggles carry `aria-pressed`.
- All four dialogs use the shared `Modal`, so focus entry, trapping and return are handled.
- `/contests` has an `sr-only` `<h1>`, since the visible heading belongs to the card.
- Disabled threshold inputs say **why** they are disabled rather than just being inert.

Not covered: the sticky-column table is a wide two-axis scroll region, which is workable but not
verified with a screen reader.

## 7. Styling and theming

One stylesheet, `contests.css`, 699 lines, **every selector under `wb-ct-`**. Nothing here is a global
rule and nothing styles a shared component.

Read `contests.css:1-29` before changing any layout — the containment contract is stated there, and
its three rules are summarised in
[ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes).
