# 03 — Runtime Adapters

Adapters implement [`../src/adapters/types.ts`](../src/adapters/types.ts).

```text
RuntimeAdapter
  loadGraph()
  getRunState(runId)
  setStart(runId, stageId)       # where Start begins
  clearStart(runId)
  setStartInput(runId, value)    # JSON input for the start node
  setStopAfter(runId, stageId)   # breakpoint
  clearStop(runId)
  step(runId)
  start(input?)                  # run from start → stop or end
```

| Adapter | Mode | Control | Status |
|---------|------|---------|--------|
| `SimulatedAdapter` | In-browser demo | Yes | **Done** |
| `NoopAdapter` | Fixture only | No | **Done** |
| Live orchestrator adapter | Cluster | Yes | Planned |
| `TraceDumpAdapter` | Offline JSON bundle | No (browse/replay UI) | Planned |

## Start point + editable input (demo)

`SimulatedAdapter` keeps `startNodeId` and `startInput` on `RunState`:

1. **Set start** on a node (defaults to the graph entry).
2. Edit that node’s input in the inspector (JSON); **Apply** / blur calls `setStartInput`.
3. **Start** resets attempts, parks on the start node, then auto-presses **Step next** until **stop**, failure, or the end. The canvas refreshes after each step so the current-node highlight moves. Recording is the same as manual Step.
4. **Continue** does not reset. It resumes from the parked node (past a stop) and auto-steps until the next stop, failure, or the end. Previous node I/O stays in the session.

Downstream nodes still use fixture `sampleInput` / `sampleOutput` in the demo. Live adapters should map start input to the host’s real workflow/job payload.

## Live adapter (planned)

Maps UI actions onto host patterns (illustrative):

| UI action | Typical host mechanism |
|-----------|------------------------|
| Open run | Workflow / job id + status query |
| Set start | First stage / continue-as-new entry |
| Set start input | Workflow start args / memo |
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
