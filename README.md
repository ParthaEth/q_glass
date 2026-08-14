# q_glass

Glass-box **control panel** for declared durable-workflow stage graphs.

**Public API is Python**: build graphs with `GraphBuilder`, run them with
`run_node` / `run_from`, and optionally `serve` a local HTTP bridge for the
React dashboard. Graph JSON is an internal detail for the UI — hosts never
author it by hand.

Production stays **headless**. This UI is optional for design and debugging.

## Quickstart (Python + UI)

```bash
make demo
```

Installs deps if needed, then runs `python -m q_glass.examples.hello serve`,
which starts the hello API on **http://127.0.0.1:8787** and Vite on
**http://127.0.0.1:5173** (use `--headless` for API-only). Open:

`http://127.0.0.1:5173/?adapter=http&api=http://127.0.0.1:8787`

Handlers are real Python callables — edit the start `query`, click **Start**
(auto-steps so the highlight moves), and inspect each node’s I/O.

CLI-only:

```bash
cd python && pip install -e ".[dev]"
python -m q_glass.examples.hello run --query "Summarize the weekly report"
python -m q_glass.examples.hello serve   # then open the UI URL above
```

UI-only simulated mode (no Python):

```bash
make demo-ui
```

More detail: [docs/07-python-api.md](docs/07-python-api.md),
[examples/README.md](examples/README.md).

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
| [07 — Python API](docs/07-python-api.md) | GraphBuilder, runtime, serve |

## License

MIT — see [LICENSE](LICENSE).
