# 04 — Visualizers

## Default

Every activity/decision I/O side renders as **pretty-printed JSON** in the
inspector ([`NodeInspector`](../src/components/NodeInspector.tsx) →
[`IoPane`](../src/visualizers/IoPane.tsx)). That is the always-available
fallback and the only editor for start-node input.

## Host plugins (Python)

Hosts register **Python** callables that turn a payload into a declarative
`ViewSpec`. The React UI only ships generic widgets — no domain components in
core, and hosts do not need Node/React.

```python
from q_glass import TableView, register_visualizer

@register_visualizer(
    id="hello.draftPlan",
    match_stage="draft_plan",
    side="out",
    title="Plan",
)
def viz_draft_plan(value: object) -> TableView | None:
    if not isinstance(value, dict):
        return None
    plan = value.get("plan") or []
    return TableView(
        columns=["step", "name"],
        rows=[[i + 1, str(s)] for i, s in enumerate(plan)],
    )
```

Import the module that registers visualizers **before** `serve(graph)` so the
in-process registry is populated.

### Match rules

| Field | Meaning |
|-------|---------|
| `match_stage` | Stage id string or list; `"*"` matches any stage after specifics |
| `side` | `"in"`, `"out"`, or `"both"` |

Return `None` to omit that visualizer for a given payload. Exceptions are
swallowed so one bad host view cannot break the inspector.

### ViewSpec kinds

| `kind` | Fields | UI |
|--------|--------|----|
| `table` | `columns`, `rows` | HTML table |
| `timeline` | `anchors[{id,t,label}]`, optional `duration` | Anchor list + rail |
| `markdown` | `text` | Small markdown subset |
| `html` | `html` | Sandboxed iframe |

### Wire protocol

`POST /api/visualize`

```json
{
  "stageId": "draft_plan",
  "nodeId": "draft_plan",
  "side": "out",
  "value": { "...": "payload" }
}
```

Response:

```json
{
  "visualizers": [
    { "id": "hello.draftPlan", "title": "Plan", "view": { "kind": "table", "...": "..." } }
  ]
}
```

HttpAdapter calls this when a node is selected. Simulated-only mode (no Python
API) stays JSON-only.

## Rules

1. Core ships **no** domain visualizers (hello demo only).
2. Unknown stages always degrade to JSON.
3. Plugins must tolerate partial / missing payloads.

Related: [02-graph-schema.md](./02-graph-schema.md),
[05-trace-dumps.md](./05-trace-dumps.md), [07-python-api.md](./07-python-api.md).
