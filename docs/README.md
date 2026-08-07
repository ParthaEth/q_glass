# q_glass — Design Docs

Long-lived plans for the glass-box control panel. Implementation code lives at
the repo root (`src/`); these markdown files stay as the shared source of truth
for schema, adapters, and roadmap.

## Document index

| Doc | Purpose |
|-----|---------|
| [00-overview-and-goals.md](./00-overview-and-goals.md) | Problem statement, goals, headless vs interactive |
| [01-architecture.md](./01-architecture.md) | GraphDefinition SSOT, adapters, plugins |
| [02-graph-schema.md](./02-graph-schema.md) | Node kinds, edges, attempts |
| [03-runtime-adapters.md](./03-runtime-adapters.md) | Live control vs TraceDump offline |
| [04-visualizers.md](./04-visualizers.md) | Default JSON inspector + plugin API |
| [05-trace-dumps.md](./05-trace-dumps.md) | Offline bundle format |
| [06-roadmap.md](./06-roadmap.md) | Scaffold → live adapter → dumps → plugins |

## Quick mental model

```text
Host app registers GraphDefinition (static)
        │
        ├─► q_glass UI  (display, stop/step, I/O, plugins)
        └─► Host orchestrator (real execution; unchanged in production)
```

Demo today: `make demo` loads
[`../src/fixtures/hello-pipeline.sample.json`](../src/fixtures/hello-pipeline.sample.json).

Host-specific integration docs belong in the **host** repository, not here.
