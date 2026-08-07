# 02 — Graph Schema

Types live in [`../src/types/graph.ts`](../src/types/graph.ts). The demo fixture
is [`../src/fixtures/hello-pipeline.sample.json`](../src/fixtures/hello-pipeline.sample.json).

## GraphDefinition

| Field | Meaning |
|-------|---------|
| `id` | Stable graph id, e.g. `myapp.pipeline.v1` |
| `version` | Semver of this declaration |
| `label` | Human title |
| `nodes` | Activities, decisions, subgraphs |
| `edges` | Directed links; `cycle: true` for repair loops |

## Node kinds

| `kind` | Chart shape | Executor |
|--------|-------------|----------|
| `activity` | Rectangle (process) | One unit of work — set `stageId` + `activityName` |
| `decision` | Diamond | Branch — **no** activity |
| `subgraph` | Group / child workflow | Optional nesting |

### Visual type (`visualType`)

Optional override for how the node is drawn. If omitted, defaults from `kind`:

| `visualType` | Flowchart convention | Default for |
|--------------|----------------------|-------------|
| `rounded` | Process / activity | `activity` |
| `rect` | Subroutine / group | `subgraph` |
| `diamond` | Decision | `decision` |
| `stadium` | Terminator (start/end) | *(set explicitly)* |

Example:

```json
{ "id": "has_issues", "kind": "decision", "visualType": "diamond", "label": "OK?" }
```

### Activity nodes

- `id` — prefer the host **catalog stage name** (same as stop/breakpoint ids)
- `stageId` — usually equals `id`
- `activityName` — executor activity / task name
- `sampleInput` / `sampleOutput` — demo or schema examples
- `position` — layout hint for the canvas

### Decision nodes

No `activityName`. The UI highlights them from run state, not from activity
completion.

## Edges

| Field | Meaning |
|-------|---------|
| `source` / `target` | Node ids |
| `label` | e.g. `Yes` / `No` / `loop` |
| `cycle` | Feedback / repair edge (animated in UI) |

## Attempts

Loops **reuse** the same node id. Run state tracks
`nodeAttempts[nodeId] = [{ attempt, status, input, output }]`. Do not clone
nodes per attempt in the declared graph.

## Mapping rule of thumb

- Every **work box** on the product flowchart → one `activity` node  
- Every **diamond** → one `decision` node  
- Repair / replan arrows → `cycle` edges  

Next: [03-runtime-adapters.md](./03-runtime-adapters.md).
