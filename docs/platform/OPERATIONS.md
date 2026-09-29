# Platform — Operations

| | |
|---|---|
| **Module** | `platform` |
| **Source** | `vite.config.ts`, `package.json`, `firebase.json`, `.env` |
| **Routes** | — |
| **Backend module** | `accounts` |
| **API prefix** | `/api/accounts/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `7e3b7f1` — 2026-09-27 |

## 1. Environment and configuration

All configuration is `VITE_`-prefixed and read through `import.meta.env`. Vite inlines these
at build time, so **every value here ships to the browser**; none of them may be a secret.

| Variable | Default | Effect |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` (hard-coded per service) | the Django backend. The single most important variable — without it the app talks to localhost. |
| `VITE_FRONTEND_BASE_URL` | — | this app's own origin, for links the backend must send back to (OAuth return, ticket links) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | — | Stripe Elements in `events` and `settings` |
| `VITE_FIREBASE_API_KEY` | — | Firestore reads for the home carousel and video config |
| `VITE_FIREBASE_AUTH_DOMAIN` | — | required by the Firebase SDK's initializer |
| `VITE_FIREBASE_PROJECT_ID` | — | " |
| `VITE_FIREBASE_STORAGE_BUCKET` | — | " |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | — | " |
| `VITE_FIREBASE_APP_ID` | — | " |
| `VITE_FIREBASE_MEASUREMENT_ID` | — | analytics |

**`.env.example` is incomplete.** It lists the Firebase and Stripe keys but omits
`VITE_API_BASE_URL` and `VITE_FRONTEND_BASE_URL`. A fresh clone that copies it will build
and run, then silently point every request at `http://localhost:8000` — which looks like a
backend outage rather than a missing variable. Fixing the example file is the first item in
[PHASES.md §5](PHASES.md#5-outstanding).

`.env` is gitignored. `.env.example` also contains real Firebase project values, which is
acceptable only because Firebase web config is public by design.

## 2. Build and run

```bash
npm install
npm run dev          # Vite dev server on :3000, opens a browser (vite.config.ts:20)
npm run type-check   # tsc --noEmit
npm run lint         # eslint, --max-warnings 0
npm run build        # tsc && vite build → build/
npm run preview      # serve the built output
npm run perf:contests  # contests page latency, see docs/contests/OPERATIONS.md §4
```

`npm run build` type-checks first, so a type error fails the build.

**`npm run lint` does not currently pass.** It runs at `--max-warnings 0` and reports 7
errors and 117 warnings, all pre-existing:

| Rule | Count | Where |
|---|---|---|
| `no-unsafe-finally` | 3 | `team/associate-tracker:590`, `team/licensing-tracker:386`, `team/production-tracker:881` |
| `no-constant-condition` | 2 | `team/mission-tracker-columns:130`, `team/production-tracker:948` |
| `no-empty` | 1 | `systematic-tools/pages/ten-systematic-tools-page.tsx:444` |
| unused `eslint-disable` | 1 | `systematic-tools/components/pdf-annotator:619` |

Five of the seven are in [team](../team/), two in `systematic-tools`. `no-unsafe-finally` is the
one worth caring about: a `return` inside `finally` discards a thrown error, so in a tracker it can
turn a failed save into a silent success.

`type-check` and `build` do pass. Because lint is already red, it cannot act as a gate: the
only workable check on a change is whether it *adds* to these counts. Getting to zero is
listed in [PHASES.md §5](PHASES.md#5-outstanding).

### Build configuration

| Setting | Value | Source |
|---|---|---|
| Output | `build/` (not `dist/`) — matches `firebase.json`'s `public` | `vite.config.ts:23` |
| Sourcemaps | on, in production | `vite.config.ts:24` |
| Vendor chunks | `react-vendor`, `ui-vendor`, `query-vendor`, `firebase-vendor` | `vite.config.ts:26` |
| Route chunks | one per lazy route | `lazyLoad` in `router/index.tsx` |
| Aliases | `@` → `src`, `@shared`, `@features`, `@core` | `vite.config.ts:11` |
| Extra plugin | `gmsManifestPlugin` emits the GMS target manifest at build time | `vite-plugin-gms-manifest.ts` |

The `firebase-vendor` chunk exists for two Firestore reads; see
[ARCHITECTURE.md §7](ARCHITECTURE.md#7-integration-points).

## 3. Feature flags and rollout

There are **no client-side feature flags.** Nothing is switched on by an env var or a build
flag. Every gated feature is gated by a backend capability the client asks about at runtime:

| Capability | Endpoint | Gates |
|---|---|---|
| `homev2:read` | `/api/wbreporting/my-access/` | `/home-v2`, `/leaderboards`, `/contests` |
| `wbreporting:read` / `:manage` | `/api/wbreporting/my-access/` | `/admin/reporting-pipeline`, `/admin/contest-settings` |
| `gms:author` | `/api/gms/my-access/` | `/admin/guidance` |
| `products:read` | `/api/admin/products` access hook | `/admin/products` |
| builder access | `/api/builderai/my-access/` | the Builder AI group |
| misalignments | `/api/misalignments/` access hook | the data-integrity reports |

**Rolling a feature out is therefore a backend grant, not a frontend deploy.** Granting
`homev2:read` to a user in the access console makes the route and its menu entry appear on
their next page load. Revoking it makes them vanish. No release is involved.

The corollary: a frontend deploy cannot turn a gated feature on, and shipping gated code is
safe.

## 4. Tests and checks

**There is no test suite.** No test runner is installed, and there are no test files in
`src/`. The automated checks are `type-check`, `lint`, and a successful `build`.

What stands in for tests:

1. `npm run type-check` — the wire types in each module's `types/` are the real contract
   check. A backend field rename surfaces here. **Passes.**
2. `npm run build` — catches a broken lazy import or a bad alias. **Passes.**
3. `npm run lint` — **fails**, see §2. Compare counts before and after a change rather than
   expecting green.
3. Manual verification against a running backend, per module, recorded in that module's
   `OPERATIONS.md` §4.

Backend behaviour **is** tested, in `mlm_platform`. When a change spans both repos, the
backend test suite is the safety net; treat a green frontend build as necessary and not
sufficient.

## 5. Deployment

Firebase Hosting, site `v2-wealthbuilder` (`firebase.json`):

```bash
npm run build
firebase deploy --only hosting
```

`build/` is served with a catch-all rewrite to `/index.html`, which is what makes client-side
routing work on a deep link.

**Coupled deploys.** Several feature branches must merge and deploy **with** their backend
counterpart, because the frontend calls endpoints that do not exist yet on the other side:
`feature/wb-leaderboards`, `feature/wb-contests`, `feature/wb-gms`,
`feature/wb-reporting-pipeline`, `feature/bpm-v2` — each has a matching branch in
`mlm_platform`. Merging one side alone produces a page that renders and then fails every
request. The affected module's `OPERATIONS.md` §5 names its counterpart.

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Every request 404s or connection-refuses | `VITE_API_BASE_URL` unset, so requests go to `localhost:8000` | `console.log(import.meta.env.VITE_API_BASE_URL)`; it is baked in at build time, so a wrong value needs a rebuild, not a restart |
| Everything 401s | no or stale `wb.authToken` | `localStorage.getItem('wb.authToken')`. There is no central 401 handler, so the app will not redirect you to `/login` — clear storage and sign in again |
| A POST becomes a GET and loses its body | missing trailing slash on the path | Django's `APPEND_SLASH` redirects; all paths end in `/` |
| A menu entry is missing for one user | the capability is not granted | the module's `my-access` response in the network tab, then the backend access console |
| A gated route bounces to `/home` | guard resolved false or errored | the `my-access` request; a 500 there is indistinguishable from a denial in the UI |
| A stale response overwrites a newer one | selection not in the query key, or `signal` not forwarded | the hook's `queryKey` — compare with `use-leaderboards.ts:31` |
| Blank page after deploy, works locally | a lazy chunk 404ing against a stale host | hard reload; confirm `build/` was redeployed whole, not partially |
| Theme resets on reload | the `ui` slice is not persisted | expected — theme is in-memory Zustand, not `localStorage` |
