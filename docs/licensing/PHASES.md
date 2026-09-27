# Licensing — Phase History

| | |
|---|---|
| **Module** | `licensing` |
| **Source** | `src/features/licensing/` |
| **Routes** | 4 under `/licensing/*` |
| **Backend module** | — |
| **API prefix** | — |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

> Phases marked `~` are reconstructed from the commit history. There was no plan for this module. The `LI`
> prefix is assigned by this document.
>
> The backend's `ADMIN_CONTENT_MANAGEMENT_GUIDE.md` — now in [`docs/_archive/`](../_archive/ADMIN_CONTENT_MANAGEMENT_GUIDE.md) —
> proposed database-backed content for these pages, including `track_license_chapters`,
> `crash_course_modules` and `licensing_documents_items` tables. **None of it was built**, which is why the
> curriculum is still a constant. That archived document is the closest thing to a design record for where
> this module was meant to go.

## 1. Timeline

| Phase | Status | Shipped |
|---|---|---|
| ~1 | Shipped | Track My License, with `localStorage` progress |
| ~2 | Shipped | Crash Course and the chapter player, with progress and notes |
| ~3 | Shipped | Licensing Documents |
| ~4 | **Abandoned** | Three service files, written and never connected |

## 2. Phases

### ~1 to ~3 — the three surfaces

Each shipped as a page with its content as a constant and its progress in `localStorage`. There is no
shared code between them: no components directory, and three separate storage schemes.

**Decisions.** LI1, LI2.

### ~4 — the integration that stopped (abandoned)

Three service files were written — `track-my-license-service.ts`, `crash-course-service.ts`,
`licensing-documents-service.ts` — each a correct client for an endpoint that exists on `accounts`. **None
was ever imported.**

`fetchLicensingProgress` returning `Promise<unknown>` dates the attempt: the client was written before
anybody modelled the response.

**Recorded as a phase** because the code is still there and looks like part of the module. A reader who
finds `fetchCrashCourseProgress` reasonably assumes progress is server-side. It is not.

## 3. Decision log

| ID | Decision | Rationale | Source |
|---|---|---|---|
| **LI1** | **Progress lives in `localStorage`** | It shipped the study surface without waiting for a backend contract, and for a single-device learner it works perfectly. The costs are real and were accepted: progress is per browser, notes can be lost, and no leader can see it | `track-my-license-page.tsx:5`; `chapter-course-page.tsx:5` |
| **LI2** | **The curriculum is a TypeScript constant** | Same reason — no content API was needed to ship. The cost is that a video URL fix requires a release | `track-my-license-page.tsx:9`; `crash-course-page.tsx:39` |
| LI3 | **Chapters are derived, not listed twice** | `buildChapters()` builds the fourteen chapters from `VIDEO_LIST`, so chapters and videos cannot disagree | `track-my-license-page.tsx:66` |
| LI4 | Storage keys carry a `_v1` suffix | Migration was anticipated. Nothing reads a `_v0`, so none has happened — but the suffix is what makes a future migration possible rather than a silent reset | all three keys |
| LI5 | Each key holds **one whole JSON object**, rewritten on change | Simpler than per-item keys and atomic enough for the volume involved | `track-my-license-page.tsx:107` |

## 4. Deliberately not built

- **Server-side progress.** LI1 — though three clients for it exist (see §2 ~4).
- **Admin-managed content.** LI2. The archived `ADMIN_CONTENT_MANAGEMENT_GUIDE.md` proposed it; it was not
  built, and this module is **not** on [admin](../admin/)'s content engine.
- **Any shared code between the three sub-areas.** No components directory.
- **A connection to [team](../team/)'s Licensing Tracker.** A leader's view and a learner's view are
  independent by construction.
- **Guarded `localStorage` access.** Unlike `bpm`, which wraps every access in try/catch — not a decision,
  an omission. See §5.
- **A migration path for the `_v1` keys.** LI4 left room for one; nothing uses it.

## 5. Outstanding

Ordered by risk, and the first two are the ones a learner feels.

1. **Guard every `localStorage` read.** Three pages parse it directly, and the accessor can throw in a
   private window or with site data blocked. `bpm`'s `readCachedRules()` is the pattern to copy. This is
   first because it is a crash, it is cheap, and it is the only item here that is straightforwardly a bug.
2. **Tell a learner when there is no local progress.** An absent key and a new learner are currently
   indistinguishable, so switching device looks like losing everything with no explanation. Even one line
   would remove the worst support case this module generates.
3. **Decide whether to connect the three services — and who wins.** They are written and unused. Before
   wiring them up, decide what happens to a learner who has local progress and no server record; merging
   silently in either direction will lose someone's work.
4. **Move the curriculum off constants**, if content is going to change without releases. The natural home
   is [admin](../admin/)'s content engine, which already serves File Vault and Training Center through one
   `ContentAdminApi`.
5. **Connect this module to the Licensing Tracker**, so a leader can see study progress. Depends entirely
   on item 3.
6. **Delete the three services** if the decision is that progress stays local. Leaving a complete, unused
   API client in place is the thing that misleads a reader fastest.
