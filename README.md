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

Handlers are real Python callables — edit the start `query` in the inspector,
then use the toolbar (see **Dashboard controls** below).

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

## Dashboard controls

The canvas highlight is the execution cursor. Click any completed (or failed)
node to inspect its last attempt’s **input / output**. After a full run the
inspector shows a short JSON prefix so the graph stays clickable; hit **Expand**
for the full payload. Toolbar actions:

| Button | What it does |
|--------|----------------|
| **Start** | Reset the run to the start node (keeps start JSON and any stop). Then auto-press **Step next** until a **stop**, a **failure**, or the end. The green highlight moves node by node so you can watch the graph. |
| **Continue** | Do **not** reset. Resume from the parked node (including past a stop) and auto-step until the next stop, failure, or the end. Earlier node I/O stays in the session. Disabled until something has already run. |
| **Step next** | Run exactly one node. At a stop, the first step resumes past that breakpoint without running the next handler yet. |
| **Set start** / **Clear start** | Choose where **Start** begins (default = graph entry). |
| **Set stop** / **Clear stop** | Breakpoint. **Start** and **Continue** pause after that node completes. |

**Start vs CLI `run`:** the dashboard **Start** button is a loop of **Step next**
so the UI can paint between nodes. `python -m q_glass.examples.hello run` (and
`POST /api/session/start`) still batch-run the graph in one call — useful
headless, but the highlight will not walk the canvas.

Typical loop: **Set stop** on a later node → **Start** → inspect I/O →
**Continue** to go further (or **Step next** one node at a time).

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
