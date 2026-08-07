# 04 — Visualizers

## Default

Every activity/decision I/O side renders as **pretty-printed JSON** in the
inspector ([`NodeInspector`](../src/components/NodeInspector.tsx)). That is the
always-available fallback.

## Plugin API (planned)

Hosts register visualizers keyed by stage id (and optional I/O side):

```ts
type IoSide = "in" | "out";

interface VisualizerPlugin {
  id: string;
  /** Match catalog stage ids; "*" = fallback after JSON. */
  matchStage: string | string[];
  side?: IoSide | "both";
  component: React.ComponentType<{ value: unknown; nodeId: string }>;
}
```

Hosts may add domain views (tables, timelines, diffs). Core does not ship them.

## Rules

1. Core ships **no** domain visualizers.
2. Unknown stages always degrade to JSON.
3. Plugins must tolerate partial / missing payloads.

Related: [02-graph-schema.md](./02-graph-schema.md),
[05-trace-dumps.md](./05-trace-dumps.md).
