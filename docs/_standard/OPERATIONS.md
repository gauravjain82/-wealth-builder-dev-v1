# <Module> — Operations

| | |
|---|---|
| **Module** | `<feature-dir>` |
| **Source** | `src/features/<feature-dir>/` |
| **Routes** | `/path` |
| **Backend module** | `<app_label>` |
| **API prefix** | `/api/<prefix>/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `<sha>` — <YYYY-MM-DD> |

## 1. Environment and configuration

| Variable | Default | Effect |
|---|---|---|

## 2. Build and run

```bash
npm run dev          # http://localhost:3000
npm run type-check
npm run lint
npm run build
```

<Anything module-specific: a chunk it emits, a build plugin it needs.>

## 3. Feature flags and rollout

<Which permission or flag exposes this module, who grants it, and what the user sees
without it.>

## 4. Tests and checks

<What is actually verified today, and by what. If there is no automated test, say so
plainly and name the manual check that stands in for one.>

## 5. Deployment

<Whether this ships alone or must go with a backend branch. Name the coupling.>

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
