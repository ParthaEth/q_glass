# q_glass — Design Docs

Long-lived plans for the glass-box control panel. Implementation lives at the
repo root (`src/` for the React UI, `python/` for the public API). These
markdown files stay as the shared source of truth for schema, adapters, and
roadmap.

## Document index

| Doc | Purpose |
|-----|---------|
| [00-overview-and-goals.md](./00-overview-and-goals.md) | Problem statement, goals, headless vs interactive |
| [01-architecture.md](./01-architecture.md) | GraphDefinition SSOT, adapters, plugins |
| [02-graph-schema.md](./02-graph-schema.md) | Node kinds, edges, attempts |
| [03-runtime-adapters.md](./03-runtime-adapters.md) | Live control vs TraceDump offline |
| [04-visualizers.md](./04-visualizers.md) | Default JSON inspector + plugin API |
| [05-trace-dumps.md](./05-trace-dumps.md) | Offline bundle format |
| [06-roadmap.md](./06-roadmap.md) | Scaffold → Python API → dumps → plugins |
| [07-python-api.md](./07-python-api.md) | GraphBuilder, run_node/run_from, serve |

## Quick mental model

```text
Host Python (GraphBuilder + handlers)
        │
        ├─► run_node / run_from / CLI
        └─► serve (HTTP) ──► q_glass UI (HttpAdapter)
```

Graph JSON is only the wire format between `serve` and the React app.

Demo: `make demo` (Python handlers + UI). Simulated fixture only: `make demo-ui`.

Host-specific integration docs belong in the **host** repository, not here.
