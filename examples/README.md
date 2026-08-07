# Examples

## Hello pipeline (recommended)

Small declared graph with a decision + repair loop. Handlers are **real Python
callables** — not sample-I/O theater.

### Run (Python + dashboard)

```bash
cd path/to/q_glass
make demo
```

Open **http://127.0.0.1:5173/?adapter=http&api=http://127.0.0.1:8787**.

Or:

```bash
cd python && pip install -e ".[dev]"
# once: npm install in the q_glass repo root
python -m q_glass.examples.hello serve
# API-only: python -m q_glass.examples.hello serve --headless
```

`serve` starts the Vite UI automatically unless `--headless`.

CLI once:

```bash
python -m q_glass.examples.hello run --query "Summarize the weekly report"
```

### Try it

1. Click a node — blue **selected** highlight.
2. **Set start** — chip `start: …` marks where the run begins (default = graph entry).
3. With the start node selected, edit **Input** JSON in the right panel → **Apply input**.
4. Optionally **Set stop** on a later node.
5. **Start** — runs Python handlers from the start node until stop or the end.
6. **Step next** advances one stage (or resumes past a stop).

Source: [`../python/q_glass/examples/hello.py`](../python/q_glass/examples/hello.py).
Docs: [07-python-api](../docs/07-python-api.md).

## Simulated UI-only (fallback)

```bash
make demo-ui
```

Uses the in-browser `SimulatedAdapter` and
[`../src/fixtures/hello-pipeline.sample.json`](../src/fixtures/hello-pipeline.sample.json)
when no Python API is available. Implementation detail — prefer the Python path above.
