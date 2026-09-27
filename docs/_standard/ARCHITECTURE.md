# <Module> — Architecture

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

## 1. Layering

<Which layers exist and what each is allowed to do. State the rule the module actually
follows, and name any place it does not.>

## 2. Component map

```
<ASCII diagram: route → page → components, and which hook each one calls>
```

| File | Role |
|---|---|

## 3. Primary flows

### 3.1 <Flow name>
<Numbered steps, each citing src/features/<module>/<file>.tsx:line.>

## 4. Server state and caching

| Hook | Query key | staleTime | Invalidated by |
|---|---|---|---|

<Why these keys and these times. Cancellation behaviour.>

## 5. Local and URL state

| State | Owner | Lives in |
|---|---|---|

## 6. Permissions and gating

<Which capability flag gates what, where it is read, and what the server enforces
independently. Hiding a control is not authorization — say what is.>

## 7. Integration points

## 8. Invariants and failure modes

| Invariant | Enforced by | Breaks as |
|---|---|---|
