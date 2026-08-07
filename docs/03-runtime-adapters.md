# 03 — Runtime Adapters

Adapters implement [`../src/adapters/types.ts`](../src/adapters/types.ts).

```text
RuntimeAdapter
  loadGraph()
  getRunState(runId)
  setStopAfter(runId, stageId)   # control
  step(runId)                    # control
  start(input?)                  # control
```

| Adapter | Mode | Control | Status |
|---------|------|---------|--------|
| `SimulatedAdapter` | In-browser demo | Yes | **Done** |
| `NoopAdapter` | Fixture only | No | **Done** |
| Live orchestrator adapter | Cluster | Yes | Planned |
| `TraceDumpAdapter` | Offline JSON bundle | No (browse/replay UI) | Planned |

## Live adapter (planned)

Maps UI actions onto host patterns (illustrative):

| UI action | Typical host mechanism |
|-----------|------------------------|
| Open run | Workflow / job id + status query |
| Set stop | Breakpoint / `stop_after` signal or start input |
| Step next | Signal to advance to next catalog stage |
| Highlight node | Current / completed stage fields from overview |
| I/O | Task results + host-persisted stage artifacts |

**Production**: do not wait on the UI. Default stop to the final stage and run
headless. q_glass is opt-in.

Prefer **barriers between stages** over pausing inside task bodies.

## TraceDumpAdapter (planned)

Loads a [trace dump](./05-trace-dumps.md). No signals. User scrubes attempts
and inspects stored I/O.

## Headless

Workers never import React. Hosts that embed q_glass run it as a separate
process/page; adapters talk to the orchestrator over its API.

See also [01-architecture.md](./01-architecture.md) and
[04-visualizers.md](./04-visualizers.md).
