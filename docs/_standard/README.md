# <Module> — Overview

| | |
|---|---|
| **Module** | `<feature-dir>` |
| **Source** | `src/features/<feature-dir>/` |
| **Routes** | `/path` |
| **Backend module** | `<app_label>` → `mlm_platform/docs/<app_label>/` |
| **API prefix** | `/api/<prefix>/` |
| **Status** | Production |
| **Doc version** | 1.0 |
| **Verified against** | commit `<sha>` — <YYYY-MM-DD> |

## 1. Purpose

<Two or three paragraphs. What problem does this module solve, for whom, and what would
break if it were removed. Prose, not bullets.>

## 2. Scope

**In scope**
- <…>

**Explicitly out of scope**
- <… and where it lives instead>

## 3. At a glance

| | |
|---|---|
| Routes | <n> |
| Pages | <n> |
| Components | <n> |
| Hooks | <n> |
| Services | <n> |
| Endpoints consumed | <n> |
| LOC (ts/tsx) | <n> |
| Doc tier | Full · Lite |

## 4. Domain vocabulary

| Term | Meaning |
|---|---|
| <term> | <definition as this module uses it> |

## 5. Dependencies

**Upstream (this module imports)**
- <…>

**Downstream (imports this module)**
- <…>

**Backend**
- `<app_label>` — <which surfaces>

**External**
- <…>

## 6. Document map

| Document | Read it when |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | <…> |
| [UI.md](UI.md) | <…> |
| [API.md](API.md) | <…> |
| [OPERATIONS.md](OPERATIONS.md) | <…> |
| [PHASES.md](PHASES.md) | <…> |

## 7. Where to start reading

1. `src/features/<module>/<file>` — <why first>
2. `src/features/<module>/<file>` — <why second>
