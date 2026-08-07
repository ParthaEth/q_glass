# q_glass

Glass-box **control panel** for declared durable-workflow stage graphs.

Hosts register a static `GraphDefinition` (activity boxes, decision diamonds,
loops). q_glass displays the graph, shows per-stage I/O (JSON by default), and
can drive stop / step via a runtime adapter — or replay offline dumps — without
replacing the orchestration engine.

Production stays **headless**. This UI is optional for design and debugging.

## Quick demo

```bash
make demo
```

Installs deps if needed and opens **http://127.0.0.1:5173** with the
[hello pipeline](src/fixtures/hello-pipeline.sample.json) example. Use
**Start / Set stop / Step next** — simulated in-browser run (no cluster required).

Or:

```bash
npm install
npm run dev:open
```

More detail: [examples/README.md](examples/README.md).

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/README.md](docs/README.md) | Full index |
| [00 — Overview](docs/00-overview-and-goals.md) | Goals and non-goals |
| [01 — Architecture](docs/01-architecture.md) | Graph + adapters + plugins |
| [02 — Graph schema](docs/02-graph-schema.md) | Node/edge kinds |
| [03 — Runtime adapters](docs/03-runtime-adapters.md) | Live control vs dump replay |
| [04 — Visualizers](docs/04-visualizers.md) | Default JSON + plugin API |
| [05 — Trace dumps](docs/05-trace-dumps.md) | Offline bundle format |
| [06 — Roadmap](docs/06-roadmap.md) | Phased delivery |

## License

MIT — see [LICENSE](LICENSE).
