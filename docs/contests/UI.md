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
| **Verified against** | commit `743afe1` — 2026-09-30 (parity phase 21 audit) |

## 1. Routes and entry points

| Route | Guard | Component | Denied → |
|---|---|---|---|
| `/contests` | `ContestsRoute` (`can_view_contests`) | `ContestsPage` → `ContestsBoard` | `/home` |
| `/admin/contest-settings` | `ContestSettingsRoute` (`can_manage`) | `ContestSettingsPage` → `ContestSettings` | **`/contests`** |

**Embedded entry point.** `ContestShowcase` (§2.0) is mounted by `src/features/home-v2/` as
its own full-width "Contests" section below the leaderboard (C31). It is content-sized and needs no
wrapper. The `<CanvaVideoCard title="Event & Contests">` media card above it stays. There is no
sidebar entry: the showcase's **View all** (`onViewAll`, passed by Home v2) opens `/contests`
([platform decision P8](../platform/PHASES.md#3-decision-log)). `ContestsCard` (§2.1) is still
exported but no longer mounted anywhere.

The two denial targets differ deliberately: a reader who lands on the settings URL is returned to the
card they *can* use, not to a dead end.

Neither surface reads the query string.

## 2. Screens

### 2.0 The featured-contest showcase — `components/contest-showcase.tsx`

dtez's `wb_contests_showcase.php`, on `/home-v2` (C31). It features `contests[0]` — the
list's dtez order (C26) — and reads `GET contest-board/{id}/showcase/`. With more than one
readable contest the title is a `<select>` (`.wb-ct-sc__picker`) over the same list; picking one
refetches the showcase and the flyer for it. The choice is not remembered (C25).

| Row | Content |
|---|---|
| Banner | "Featured contest", the contest name (a picker when there are several), `period_label · Top 10 closest`, a **View all** pill. The image flyer is the background when `has_visible_flyer` and `flyer_kind === 'image'` (via `useFlyer`); otherwise a gold gradient |
| Two boards | `mode` (default `closest`): "Closest to qualifying", ranks 1–5 and 6–10. `qualifiers` does the same with qualifiers; `mixed` puts five qualifiers left and five closest (not already shown) right |
| Row | `#rank`, avatar (`photo_url` over initials), name, `agency_code · tier_name`, then `N% complete` — or a green ✓ "qualified". A null progress renders `—`, never `0%` |
| Footer | a dot and `N qualified · M in progress` (over everyone, not the ten shown), "Updated from WB contest results" |

States: loading ("Loading showcase results…"), no contest ("No contest is running right now."),
error (the message, `role="alert"`, red dot), and an empty board ("No matching people yet.").
Below a 620 px container the boards stack.

### 2.1 The card — `components/contests-card.tsx`

The compact placement, on `/home-v2`. It and the standalone page (§2.1a) read one state hook,
`useContestBoard`, so the default view, the switch rule and the standings key are one
implementation; only the rows around the standings differ. The card did not change in parity
phase 18: its screenshots at 1440 and 390 px were pixel-identical before and after.

| Row | Flexibility |
|---|---|
| Header: contest `<select>` (or a heading when there is one contest), Flyer / Filters / Help pills | fixed |
| Meta line (status, period, "Updating…") | fixed |
| Tier strip (`TierSelector`) | fixed |
| Filter summary (`wb-ct-applied`) and the team-credit note (`wb-ct-note`) | fixed |
| **`.wb-ct-scroll` (standings)** | **the single flexible row** |

Anyone editing this component needs §7's containment contract first. Adding a second `flex: 1` child
turns internal scrolling into page growth, silently.

### 2.1a The standalone page — `components/contests-board.tsx`

`/contests`, laid out as dtez's `wb_contests.php` (parity phase 18):

| Row | Component | Shows |
|---|---|---|
| Title row | `ContestsBoard` | "Wealth Builders Contests"; a status dot and line, "5 contests · N agents" (N is the standings' `total_rows`); a round `?` that opens Help |
| Contest selector | `ContestSelector` | the contests as buttons, gold when active (`aria-pressed`) |
| Filter bar | `ContestFilterBar` | always visible (§2.3), with the summary line under it |
| Contest title row | `ContestsBoard` | name; status, period, view; "Updating…" while fetching; a flyer icon when `has_visible_flyer` |
| Tier cards | `TierCards` | dtez's tier cards (§2.2); a sticky sideways strip on a narrow board |
| **`.wb-ct-scroll`** | `StandingsRegion variant="page"` | dtez's grid, `ContestResults` (§2.4, §2.5) |

**Home v2 keeps its own grid** (decided 2026-09-29, [PHASES.md §3](PHASES.md#3-decision-log),
parity phase 19). The two placements share `useContestBoard`, the region's loading and error
states, and the number formatting (`contest-format.ts`); the page draws dtez's tier cards, grid,
cells and pills, and the card keeps `TierSelector`, `ContestStandings` and `ContestCell`.

**No banners above the grid.** The card's applied-filter line is the filter bar's summary here.
The team-credit note (C5) moves, it does not disappear: it is the tooltip of every `BR`, `BP` and
`LIC` pill (on both placements) and the first line of the proof dialog.

**The contest order is dtez's** (C26): active first, then the earliest qualifying start, contests
with none (rolling) last, then name. The first is the one shown, as dtez shows its first active
contest. The backend sorts; the page shows the list as it comes.

**A switch** clears the tier selection and sort and keeps the filters and direction, as on dtez and
as the prefetched key requires ([ARCHITECTURE.md §3.1a](ARCHITECTURE.md#31a-switching-contest)).

### 2.2 Tier overview — `components/tier-cards.tsx` (page), `tier-selector.tsx` (card)

**On `/contests`**, dtez's cards (parity phase 19), shown when `show_tier_overview`:

| Line | Shows |
|---|---|
| Name | gold |
| Counts | "N qualified · N close · N in running"; "close" only when `show_near_qualifiers` |
| Period | `period_label` |
| Goals | the required metrics in catalogue order, dtez's `tierSummary`: "BR 30 · BP 120,000", with "Non-License" appended for a Non-License tier, or "No qualification goals". A goal with no source (C15) says so in this line's tooltip |
| Reward | "Reward: …", when the server sends one (`show_rewards`) |
| Hint | "Tap to show this tier" with nothing selected; "Tap to add" once another is; "Selected · tap to remove" on a selected card |

A selected card has a gold border and a gold tint. A wide board lays the cards out as dtez's
`repeat(auto-fit, minmax(220px, 1fr))` grid; a narrow one as a sideways, snapping strip that
**sticks to the top of the page** while the agents scroll under it (§5).

**On the Home v2 card**, the compact strip: name, period, reward and — when `show_tier_overview` —
the qualified / close / in-running counts. The response carries **every** tier, with `selected` flags, and the counts are
for the whole contest: "in running" is everyone listed, the same on every card, and a selection does
not change them (C18). A tier that requires a metric with no source says "no source, counts as 0"
(C15). **The cards are also the toggles**, with the three-state gesture in
[ARCHITECTURE.md §3.3](ARCHITECTURE.md#33-tier-selection--the-three-state-gesture).

On a narrow card the row becomes a horizontally scrollable, snap-friendly strip — **inside the card,
never at page level**.

Both placements: the response carries every tier with `selected` flags, the counts are the whole
contest's (C18), and the cards are the toggles.

### 2.3 Filters — `components/contest-filters.tsx` (card), `contest-filter-bar.tsx` (page)

Two placements of the same controls: a modal behind the card's Filters pill on `/home-v2`, and an
always-visible bar on `/contests`.

| Control | Card modal | Page bar |
|---|---|---|
| Person | autocomplete (`UserAutocompleteDropdown`) | a search box: partial name or agent code, suggestions as a `<datalist>`, **Enter applies** |
| View | Everyone I can see · Just this person · Base shop · SMD base · Super base · Super team (`scope-options.ts`, one list for both). **Defaults to Everyone I can see** (All) with no person, still limited to what the viewer may see (C20) | same |
| **Net** | labelled **"Direct reports only"** | same |
| Leaders / Agents | include leaders / agents | same |
| Upline / Leader | — | move the applied person to their recruiter / leader and re-apply |

Everything is a draft until **Apply** (or Enter in the page's search box).

**SMD base shows the same people as Base shop.** It is in the menu for parity with dtez's five
person views. The backend walks both with zero downline SMD generations
(`mlm_platform` `population.py`, `SCOPE_ALIASES`), which is dtez's own generation map, so the rows
are equal. That is not a bug to fix.

**The page's summary line** reads, as dtez's does, "Selected: *person or All agents* · View:
*view* · Roles: *Leaders + Agents* · *N* leaders identified". *N* is `leader_count` from the
standings: the people somebody names as their leader, which is the set the Leaders and Agents
boxes split on. It is counted over the view's candidate map (everyone the viewer may see for All;
every coded person for a person-based view), so neither the view nor the boxes change it: 334 on
production, dtez's figure. An older backend without the field shows `—`.

**Resolving the person on Apply.** An exact label (`Name [CODE]`), agent code or name wins; otherwise
the search's first match. **An empty box selects nobody.** dtez's search matches its first person
for an empty string (every label contains it), so Personal with an empty box shows a stranger; ours
does not.

**Upline and Leader** are disabled until a person is applied, and each stays disabled while that
person's profile has no such link (Leader also when the person leads themselves, as on dtez). They
read the profile endpoint, so the buttons can take seconds to enable: ~7–8 s on the production
API in parity phase 20, when the endpoint still loaded the viewer's whole hierarchy (phase 18's
~50 s was a local backend). ⟦P20⟧The coupled backend now reads only the chains it needs
(`reader_nodes`)⟦/P20⟧; the time after that change is unmeasured.

**The Net label is not a style choice.** The contest `net` filter keeps the selected person plus
whoever reports directly to them. Package 2's *Net Base* is a different rule entirely, and reusing
that name here would be read as that rule (decision C10). Do not relabel it "Net" or "Net Base".
dtez labels it "Net"; whether parity of the label outranks C10 is an open question,
C27 ([PHASES.md §3](PHASES.md#3-decision-log), under C10).

### 2.4 Standings — `components/contest-results.tsx` (page), `contest-standings.tsx` (card)

**On `/contests`**, dtez's single CSS grid (parity phase 19): `240px repeat(n, minmax(260px, 1fr))`,
at least 240 + 260 × n px wide, scrolling sideways inside `.wb-ct-results` with the agent column
sticky. On a narrow board the same rows reflow into **one stacked card per agent** and the header
row is hidden, as on dtez. One rendering, not two.

| Part | Shows |
|---|---|
| Header | "Agent"; per tier, the name with **↓ / ↑** when sorted on it, "N qualified · N close" ("close" only when `show_near_qualifiers`), and the period |
| Agent | the name (opens the profile); "code · level", with "No level" when the person has none; "Leader: X · Best N%", with "Leader: -" when there is no coded leader |

Each agent part appears only when the server sent it: a hidden code is `""`, and a hidden level or
leader is **absent** from the row (the display settings `show_agent_code`, `show_level`,
`show_leader`, `show_best_percent`). So "No level" and "Leader: -" always mean *none*, never
*hidden*. The header row does not stick vertically: the grid is its own sideways scroll container,
as dtez's `.standings` is, and there it does not stick either.

**On the Home v2 card**, two renderings of the same data, **both always in the DOM**, with CSS
choosing one by container width. Keeping both mounted is what makes sort and focus state identical
between them.

| Rendering | Layout |
|---|---|
| Wide | a table with a sticky header **and** a sticky agent column, scrolling on both axes inside the element |
| Narrow | one card per agent, tier results stacked under the identity line |

Both placements:

With no tier header chosen, rows are ordered by **best %** — the highest score over the tiers open to
the agent, never below 0 — then name, and no header shows an arrow (C16). Clicking a tier header
sorts on it. Only the **selected** tiers are columns. Percentages arrive as **whole numbers** (C20);
the server qualifies and sorts on the exact value.

A row appears for anyone with activity on a selected tier, **even if every one of its cells is
blank** (C17, as on dtez).

### 2.5 The cell — `ResultCell` in `contest-results.tsx` (page), `contest-cell.tsx` (card)

**On `/contests`**, dtez's cell (parity phase 19):

| Cell | When | Looks |
|---|---|---|
| "SMD: Qualified · 100%" | qualified | whole cell green (`#12351f`, border `#348352`, a 4 px bar) |
| "SMD: Almost qualified · 89%" | close, and `show_near_qualifiers` | whole cell yellow (`#332b10`, border `#8b7224`, a 4 px bar) |
| "SMD: 59%" | otherwise eligible | untinted |
| **Blank** | **ineligible** | a dark empty block, "Not eligible for SMD" to a screen reader |

Under the heading, one pill per required metric, **"BR 15 / 30"**, toned **per metric** as dtez's:
green border and text when that metric's actual reaches its goal (`met`), yellow when
actual ÷ goal ≥ `near_percent`, computed from the unrounded amounts. The pills keep the card's
behaviour: the BR / BP / LIC tooltip is the team-credit note (C5), a sourceless metric is dashed
and italic with its reason as the tooltip (C15), and a pill is disabled when proof is not
available.

**On the Home v2 card**, a cell is one of three things:

| Cell | When |
|---|---|
| A whole-number percentage, coloured green (qualified) or gold (close), with metric pills "BR **15**/30" | eligible |
| **Blank** | **ineligible** |

Both placements:

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

Four, all through the shared `Modal`, laid out as dtez's (`wb_contests.php` `proof`, `detailTable`,
`openProfile`, `pathMarkup`, `openFlyer`; parity phase 20). Each opens immediately with a loading
state and fetches its own data. All four are `dismissible`: **Escape closes the top dialog and a
click on its backdrop closes it**, as on dtez; × closes it too. They carry dtez's palette themselves
(`.wb-ct-modal`), so they read the same in both placements and in the light theme.

| Dialog | Title · subtitle | Body |
|---|---|---|
| Proof | "*Agent* · BR" · "2026-07-01 to 2026-12-31" (the tier's period label until the proof's own arrives) | the C5 note first (BR / BP / LIC); a summary, "BR source total: **N**" with "· first 1,000 records shown" when `truncated`, and "Client and policy detail: *visibility*"; the cards and Goal; the formula; the source table (below). `{ }` in the header opens the developer panel, only when the response has `sql` |
| Profile | the name · "07VIR · SMD" ("No agent code", "No level"; the level part left out when hidden) | a two-column grid: Agency level, Status (Active / Inactive), License status (Licensed / Not licensed), Agent code, Recruiter "Name [CODE]", Assigned leader "Name [CODE]", Hierarchy record (the user id); then "Recruiting connection, agent to highest known upline" and "Reporting leader connection" as node diagrams — one box per person, name over code, joined by gold arrows — or "No hierarchy path found." |
| Flyer | "*Contest* Flyer" | the image or PDF (short-lived signed URL), and an "Open … in a new tab" link |
| Help | "How to Use Contest Results" | dtez's help rewritten for this page: Progress and qualification, Sorting and details, Views, Contest flyer. Our view names; "Direct reports only" where dtez says "Net" (C10; C27 open); whole-number rounding and sourceless requirements (C15, C20) |

**The proof table** takes the server's `columns` and renders three shapes:

| Metrics | Columns |
|---|---|
| `pr`, `br` | Date · Agent · Agent Code · Recruited By · Recruited By Code |
| `pp`, `bp` | Policy · Client · First Date · Last Date · First Advances · Second Advances · Other Advances · Chargebacks / Reversals · Net Points — one row per policy; the point columns right-aligned whole numbers, chargebacks negative ("-100") |
| `slic`, `lic`, `se`, `mp` | Date · Event · Person · Credited Through · Reference; the code under each name |

A person (`person`, `owner`) is a button: it opens that person's **profile on top of the proof**;
closing the profile returns to the proof. A missing client or policy (hidden by the privacy
settings, so absent from the row) reads `—`. The table scrolls inside the dialog under a sticky gold
header, as dtez's does.

**The developer panel** ("Developer derivation") shows the source SQL, its parameters, the whole API
JSON, and "Copy SQL + JSON" ("Copied" for 1.2 s; "Copy was blocked by this browser." when the
clipboard refuses). The SQL exists only in responses to `wbreporting:manage` holders; for anyone else
the key is absent and there is no `{ }` button. A new proof starts with the panel closed.

### 2.7 Settings — `components/contest-settings.tsx` + `tier-editor.tsx`

Contest list, then per contest: identity, status, period mode, notes, flyer, and a `TierEditor` per
tier.

`TierEditor` enforces three rules **in addition to** the server enforcing them, because a disabled
input is not validation:

- **`TR`, `TP`, `TE` are result components, never threshold inputs.** Not rendered at all; the
  backend rejects them if a hand-written request sends one.
- **A metric with no source may be required.** `BE` and `C` have no source in this deployment; the
  input stays enabled and its `title` says it counts as 0, so the tier cannot be qualified while it is required
  (C15; `components/tier-editor.tsx:16-18`, `:214-216`).
- **Eligibility levels come from the host's level table, without "No level"** (C19). The backend
  stores the unticked levels as an exclusion, so people with no level are eligible for every tier
  except a Non-License one. All ticked and none ticked are the same instruction — "anyone"
  (`components/tier-editor.tsx:18-21`). The level checkboxes are disabled on a Non-License tier.

And it carries the `BR`/`BP`/`LIC` single-hop warning, at the moment somebody types a threshold.

## 3. States

| State | Trigger | What the user sees |
|---|---|---|
| Loading | standings in flight | a loading state in the scroll area |
| Empty | no rows for the filters | an empty body, not an error |
| No contests | the contest list is empty | "There are no contests running right now." (`contest-board-parts.tsx:44-45`) |
| **Blank cell** | `eligible: false` | a visually empty cell; meaning in the accessible text only |
| Qualified / close cell | page: `qualified`, or `near` with `show_near_qualifiers` | the whole cell tinted green / yellow, and its heading says "Qualified" / "Almost qualified" |
| Met / close pill | page: per metric, actual ≥ goal, or actual ÷ goal ≥ `near_percent` | a green / yellow pill border and text |
| Tier card hint | page: the selection | "Tap to show this tier" · "Tap to add" · "Selected · tap to remove" |
| No level / no leader | page: `level` or `leader_name` present and `""` | "No level" · "Leader: -". Absent (hidden by the display settings): the part is left out |
| Requirement with no source | `metric.available: false` | a greyed `0/goal` pill with its reason; the tier averages it as 0 and cannot qualify (C15, amending C7) |
| Listed with only blank cells | activity on a selected tier the agent is not eligible for | a row whose cells are all blank. Deliberate (C17) |
| Proof loading / empty / unavailable | the proof dialog | "Loading proof records…" · "No source records were found." · "*Label* cannot be measured in this system." with the reason (C15), never a table of zeros |
| Proof truncated | `truncated: true` | "· first 1,000 records shown" after the source total |
| Profile over proof | a name in a proof | two dialogs; Escape or a backdrop click closes the profile first |
| Team-credit note | any visible tier uses a single-hop measure | card: `team_credit_note` above the grid. Page: no banner; the note is the `BR`/`BP`/`LIC` pills' tooltip (both placements) and the proof dialog's first line |
| **Person missing** | page: Apply (or Enter) with a person-based view and an empty box, or text nobody matches | an inline error under the bar ("Select a person before applying this view." / "No one matches …"), the box marked `aria-invalid` and focused; nothing is applied |
| Upline / Leader disabled | no person applied, the profile not yet loaded, or no such link | the buttons greyed, with a title saying why |
| Applied filters | always: card, under the tier selector; page, the filter bar's summary line | the filter summary only. Until Phase 11 it also said "N without an agent code are not in these results"; scopes now hold coded users only (C22), so the count is gone from the response and the line |
| Error | non-2xx | the backend's `detail` |
| Denied | guard false | redirect: reader → `/home`, settings → `/contests` |
| **Edit conflict** | 409 `edit_conflict` | an explicit message and **Reload** — never an automatic retry |
| Flyer expired | URL past 15 min | re-signed on reopen, by the 10-minute `staleTime` |
| Considered contest | `contest_status = considered` | settings-only; not offered to readers |

## 4. Interaction rules

- **Drafts do not alter results until Apply** — or Enter in the page's person search.
- **An empty person search selects nobody**, and a person-based view without a person is refused
  in the browser. The backend would otherwise root the view at the viewer (`person or
  request.user.id`, kept for the card's first load).
- **An ineligible cell is blank and unlabelled.** Never reintroduce "Restricted".
- **`null` progress is never `0`.**
- **Toggling the last selected tier off returns to all tiers.**
- **Sort is server-side on exact values**; display rounding is cosmetic. No sort tier means best %.
- **Columns are the selected tiers; the cards are always every tier** (C18).
- **Dialogs open immediately**, then load. They are `enabled`-gated so opening the card fetches none
  of them.
- **Escape and a backdrop click close the top dialog only.** The card's Filters modal is not
  `dismissible`: a stray key does not discard a draft.
- **A name in a proof opens the profile over it**; the proof stays open underneath.
- **A 409 offers Reload.** Do not retry a save.
- **Send the whole tier collection with `replace_tiers`**, and mark removals `pending_delete` so
  intent is explicit in the payload rather than inferred from an absence.
- **The card never sets its own height.**

## 5. Responsive and print behaviour

**Container queries, not viewport breakpoints** — `@container wb-ct-card` at 34rem
(`contests.css:1421`, `:1427`). The card can be narrow on a wide screen and wide on a narrow one, so
viewport width is the wrong question. Two viewport media queries remain: 48rem (`:1442`) for the
settings screen, and 760px (`:765`), dtez's, which stacks the profile dialog's grid (the dialog
portals to `document.body`, outside any container). `prefers-reduced-motion` is honoured (`:1406`).

The standalone page adds three steps under the same container (`:1025`, `:1350`, `:1041`), after dtez's
900 px and 760 px ones: at 56rem the filter bar pairs its controls with the person search and the
actions on whole rows; at **42.75rem** — dtez's 760 px less its page and panel padding, 684 px — the
tier cards become a sticky sideways strip (cards `min(78cqw, 280px)` wide) and the grid becomes one
card per agent; at 34rem the contests and the filter controls go to two columns, every column
`minmax(0, 1fr)`. Inside the app shell a 390 px phone leaves the board about 220 px.

On `/home-v2` scrolling is owned entirely by `.wb-ct-scroll`, on both axes. Wide standings scroll
horizontally *inside* the card — never at page level. **`/contests` is different in practice:** its
host has no bounded height (the app shell's main area scrolls), so the board grows with its content
and the page scrolls, as dtez's does. Measured in parity phase 18, the same before and after it:
`.wb-ct-scroll`'s client height equals its content height at 1440 and 390 px. Since parity phase 19
the page's root and `.wb-ct-scroll` are `overflow: visible`, so neither is a scroll container and the
tier strip can stick to the page ([ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes));
the grid scrolls sideways inside `.wb-ct-results`.

No print styles. *Not applicable — unlike the Full Report, a contest board is not a handout.*

## 6. Accessibility

- **The blank cell's meaning lives in accessible text.** This is the module's most important
  accessibility decision: visually empty, explicit to a screen reader.
- Tier toggles carry `aria-pressed`.
- The page's grid is `div`s with table roles (`table`, `row`, `columnheader` with `aria-sort`,
  `rowheader`, `cell`), so it reads as the card's `<table>` does. On a narrow board the header row
  is hidden, so there is no sort control there, as on dtez.
- All four dialogs use the shared `Modal`, which since parity phase 20 is `role="dialog"` with
  `aria-modal` and `aria-labelledby` its title, moves focus into the dialog, keeps Tab inside the top
  one, and returns focus on close (to the proof's name button when a profile over it closes);
  `aria-labelledby` is set whenever a title is passed, which all four do. Before
  phase 20 this line claimed all of that and the `Modal` did none of it.
- The `{ }` toggle is `aria-expanded`; path diagrams are ordered lists, their arrows `aria-hidden`.
- `/contests` has a visible `<h1>`, "Wealth Builders Contests"; the contest name is its `<h2>`.
- The contest buttons carry `aria-pressed` in a group labelled "Contest".
- The filter bar's error is `role="alert"`, and the search box is `aria-invalid` and described by
  it while it shows.
- A threshold for a metric with no source says in its `title` that it counts as 0 (C15); no threshold
  input is disabled.

Not covered: the sticky-column table and the page's grid are wide scroll regions, which is workable
but not verified with a screen reader.

## 7. Styling and theming

One stylesheet, `contests.css`, 1,583 lines, **every selector under `wb-ct-`** (the one keyframe is
`wb-ct-spin`). Nothing here is a global
rule and nothing styles a shared component.

**The page carries dtez's palette** (parity phase 19), as custom properties on its host,
`.wb-ct-host--page`: panel `#171a18`, cells `#0a0c0a`, lines `#373c36`, gold `#efc84a`, muted
`#a2a8a3`, controls `#101310`, green `#4fb875`, yellow `#d5af35`, 6–7 px corners. The host paints its
own background and text colour, so the page no longer depends on the app theme's (the stylesheet
assumes light text, which in the light theme read as white on grey). The Home v2 card keeps its own
colours.

**The dialogs carry the same palette** (parity phase 20) on `.wb-ct-modal`, because they portal to
`document.body`, outside both hosts: panel `#171a18`, border `#4b514a`, gold titles, dtez's `#000b`
backdrop (`.wb-ct-modal-backdrop`). The shared `Modal` is Tailwind utilities, the dark-theme ones at
specificity (0,2,0); the overrides are written `div.wb-ct-modal.wb-ct-modal` (0,2,1) so they win in
any stylesheet order. They reach no other feature's `Modal`.

Read `contests.css:1-39` before changing any layout — the containment contract is stated there, and
its three rules are summarised in
[ARCHITECTURE.md §8](ARCHITECTURE.md#8-invariants-and-failure-modes).
