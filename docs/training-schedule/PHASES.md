# Training Schedule — Phase History

| | |
|---|---|
| **Module** | `training-schedule` |
| **Source** | `src/features/training-schedule/` |
| **Routes** | `/training-schedule`, `/training-schedule/attend/:token` |
| **Backend module** | `training_schedule` → `wealth-builder-dev-v1-backend/docs/training_schedule/` |
| **API prefix** | `/api/training-schedule/` |
| **Status** | Merged-not-deployed |
| **Doc version** | 2.0 |
| **Verified against** | commit `7b487dc` plus the uncommitted rebuild on `feature/training-schedule` — 2026-10-14 |

## 1. Timeline

| Phase | Date | Status | Shipped |
|---|---|---|---|
| ~1 | before 2026-09 | Superseded | A week grid with events stored in the browser |
| 2 | 2026-10-14 | Merged-not-deployed | Backend-backed rebuild: BaseShop visibility, inheritance, attendance, delete policies |
| 3 | 2026-10-14 | Merged-not-deployed | Attendance metrics: statuses, the Attendance tab, the banner, *counts toward attendance* |

## 2. Phases

### ~Phase 1 — browser-only schedule (reconstructed)

One page, 599 lines. Events were kept in `localStorage['wb_training_schedule_events']`, recurrence was
expanded client-side into unrelated events, anyone above the New Agent plan could add, and New Agent and
Agent plans were shown only events whose titles contained certain words. Nothing was shared between
users. The earlier version of these docs described it as "a static schedule".

### Phase 2 — rebuild

Everything in [README.md](README.md). Built from the request of 2026-10-14 (twelve numbered
requirements and a hand-drawn org chart: Kash → Dantes (MD) and Chris (SMD) → Anzi (SMD)).
Requirement 7 — attendance updating the associate tracker — was built and then taken out the same day
(TS6).

### Phase 3 — attendance metrics

Asked for on 2026-10-14: show SMDs who attended, how many trainings each member has attended and
whether they stopped, highlighted automatically, with charts on demand. The design was proposed and
the three open questions answered the same day: a per-training *counts toward attendance* flag (yes),
the thresholds below (agreed), and no email (not now).

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| TS1 | Hosting follows **level** (SMD and above), not a grant; the level is an admin setting. | "SMD and above can create their trainings." A grant would need handing out to every SMD. Rejected: the plan-based check the old page used (`Plan.Broker`), which is a subscription tier, not a rank. | Request 2026-10-14 §1 |
| TS2 | Inheriting is a **reference**, never a copy. | The owner's edits and deletes must reach inheritors. Rejected: copying the series, which would need syncing forever. | Request §2, §10 |
| TS3 | A host may inherit from **any** host. The upline is listed; anyone else is found by search. | Two SMDs who train together need not be upline/downline (David and Anzi under Chris). Rejected: upline-only, and siblings-only, which still fails for cousins. | Request §12 |
| TS4 | **One attendance link per training**, resolved to whichever date is open. | The host posts the same link every week. Rejected: a link per date, which must be re-copied each time. | Request §5 |
| TS5 | **Anyone signed in** who opens the link is recorded — the link is the capability. | A guest from another BaseShop on a joint call must be countable. Rejected: restricting to the audience. | Request §5 |
| TS6 | **Attendance does not write to the associate tracker** — neither `is_training` nor `training_date`. Deferred. | `is_training` is labelled "BPM attendance" on the org chart and BPM check-in already maintains `training_date`; what "Training" should mean is to be decided first. Supersedes the first build, which set both. | User, 2026-10-14 |
| TS16 | An inheritor's attendance list shows **their own BaseShop**; the owner and admins see everyone. | An inheritor published it to their people, and is answerable for them. | Assigned by this document |
| TS7 | A delete is **previewed, then confirmed against the preview**; a changed count deletes nothing. | "Show how many occurrences you are deleting… tell it will also delete attendance." | Request §8 |
| TS8 | An inheritor **cannot delete** the owner's training; they withdraw. The owner's delete removes it for every inheritor. | Reading of "it should not be allowed to delete their instance" together with "deleting should delete from all the members who inherited it". | Request §10 |
| TS9 | Two admin policies: whether a delete reaches **completed** dates (default: yes) and whether it is **blocked while inherited** (default: no). Admins are bound by neither. | "Configure what should be deleted, completed vs future, from admin dashboard." The block option covers the other reading of §10. | Request §10 |
| TS10 | The grid is in the **viewer's** zone; a training in another zone is flagged, compared by offset. | "If user time zone is different than the event timezone we should highlight it." Comparing names would flag Chicago against Mexico City when both read the same. | Request §4 |
| TS11 | The form **defaults to the host's zone** and makes the zone block the most prominent part of the form. | "By default select the timezone they are in… it can be highlighted." | Request §3 |
| TS12 | A series' **dates are fixed** once created; an edit re-times upcoming dates only. | Attendance already hangs off past dates. To change the pattern, delete the upcoming dates and create a new series. | Assigned by this document |
| TS13 | The `localStorage` schedule is **dropped, not migrated**, along with the plan/title visibility filter. | Per-browser data has no owner on the server; BaseShop visibility replaces the title filter. | Assigned by this document |
| TS14 | Settings live in a **modal on the schedule page**, not under `/admin`. | One screen, five fields, used rarely; keeps the module self-contained. | Assigned by this document |
| TS17 | Every metric is counted against **expected dates**, and "stopped" is **missed trainings in a row**, not days. | A fortnightly training would make "14 days" mean one miss. | Proposed and agreed, 2026-10-14 |
| TS18 | Statuses and defaults: Stopped = 3 in a row (having come before) · Never = none at all · Slipping = 2 in a row or under 50 % · judged over the last 8 · New until 2 expected. All five editable by an admin. | Agreed thresholds; editable because they are a coaching judgement. | User, 2026-10-14 |
| TS19 | A per-training **Counts toward attendance** flag, on by default. | Optional sessions must not mark people as slipping. | User, 2026-10-14 |
| TS20 | **No notifications.** The banner on the Schedule tab is the only nudge. | Not now. | User, 2026-10-14 |
| TS21 | The tab **highlights; charts are one click away.** Tiles and a worded needs-attention list first; the per-date and per-member charts open on demand. | "Easy way system should automatically highlight them. If they need more it should show detailed view." | Request 2026-10-14 |
| TS22 | Metrics use the member's **current** BaseShop over the whole history, computed on request. | No membership history exists; a BaseShop of hundreds over a year is a small computation. Rejected for now: a nightly snapshot table. | Assigned by this document |
| TS15 | Browsing a host's trainings **omits the meeting link** until the date is inherited. | Any host can browse any host (TS3); the link should not leak with it. | Assigned by this document |

## 4. Deliberately not built

- **Editing one date of a series** (move this Tuesday only). Delete the date and add a one-off.
- **Changing a series' recurrence or length** after creation (TS12).
- **Manual attendance** — the host ticking someone who could not open the link — and removing a record.
- **A month view, drag-to-move, Google Calendar sync.**
- **Notifications** to SMDs about stopped members (TS20), and a member's own attendance card.
- **Export** of the attendance table.
- **Restoring a deleted training from the UI.** Deletes are soft on the backend and recoverable there.
- **Importing the old browser-stored events.**

## 5. Outstanding

- **Requirement 7, tracker sync (TS6).** Decide what `is_training` and `training_date` mean — training
  attendance only, or BPM or training — then wire attendance to them. Attendance history is already
  kept per date in `TrainingAttendance`, so nothing is lost meanwhile.
- Not yet exercised in a browser against a running backend.
- Product confirmation of TS5, TS8, TS16 and the TS9 defaults — each is a reading of the request.
- `src/features/education/pages/training-schedule.css` is still a dead file.
