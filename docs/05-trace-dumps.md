# 05 — Trace Dumps

Offline bundles let you inspect a past run **without** workers or a cluster.
Used by `TraceDumpAdapter` (planned).

## Bundle sketch (v0)

```text
trace-bundle/
  manifest.json          # graphId, runId, created_at, adapter version
  graph.json             # GraphDefinition used for the run (or graph id + pin)
  stages/
    draft_plan/
      attempt-1/
        input.json
        output.json
        meta.json        # timing, model, usage, …
    validate_plan/
      attempt-1/
        …
      attempt-2/         # repair loop
        …
  orchestrator/          # optional
    history.json         # raw executor history export
```

## manifest.json (fields)

| Field | Meaning |
|-------|---------|
| `runId` | Host job / workflow id |
| `graphId` / `graphVersion` | Which declared graph |
| `completedStages` | Ordered catalog names |
| `finalStatus` | completed / failed / cancelled |

## UI behavior

- Load zip or folder → same canvas as live mode
- Timeline of attempts on cycle edges
- No **Set stop** / **Step** (or disabled with explanation)

Live vs dump: [03-runtime-adapters.md](./03-runtime-adapters.md).
