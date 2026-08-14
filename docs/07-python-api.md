# 07 — Python API

Hosts build and run graphs in **Python**. Graph JSON is an internal wire format
for the React dashboard — not something application code should author by hand.

## Install

```bash
cd python
pip install -e ".[dev]"
```

Requires Python 3.10+.

## GraphBuilder

```python
from q_glass import GraphBuilder, run_from, serve

def accept(inp: dict) -> dict:
	return {"job_id": "hello-1", "query": inp.get("query", "")}

def draft(inp: dict) -> dict:
	q = inp.get("query", "")
	return {"plan": ["collect", "analyze", "write"], "query": q}

b = GraphBuilder("q_glass.hello.v1", label="Hello pipeline")
b.activity(
	"accept_request",
	accept,
	visual_type="stadium",
	label="Accept request",
	sample_input={"query": "Summarize the weekly report"},
)
b.activity("draft_plan", draft, label="Draft plan")
b.decision("has_issues", label="Validation issues?")
b.edge("accept_request", "draft_plan")
# …
graph = b.build()
```

| Method | Role |
|--------|------|
| `activity(id, handler, *, label=, visual_type=, sample_input=)` | Node with `(dict) → dict` handler. `sample_input` seeds the editable start panel only. |
| `decision(id, *, label=)` | No handler; runtime follows Yes/No (or first non-cycle edge). |
| `edge(source, target, *, label=, cycle=)` | Control-flow edge. Mark repair loops with `cycle=True`. |
| `group(id, members, *, label=)` | Visual-only bounding box around member node ids (dashboard only; no runtime effect). |
| `build()` | Returns an opaque `Graph`. |

Handlers for v1 are plain callables: `(dict) -> dict`.

## Runtime

```python
from q_glass import run_node, run_from

out = run_node(graph, "draft_plan", {"query": "…"})
result = run_from(
	graph,
	start="accept_request",
	input={"query": "…"},
	stop_after="validate_plan",  # optional pause
)
# result.final_output, result.path, result.attempts, result.stopped_after
```

- **`run_node`** — invoke one handler (decisions return input unchanged).
- **`run_from`** — walk the happy path, record per-node attempts, stop after completing `stop_after` if set. Used by the CLI and `POST /api/session/start`. The dashboard Start button does not call this; it loops Step so each node’s I/O is visible as the run proceeds.
- Decisions: if payload `decision_yes` is set, that boolean selects **Yes**/**No**;
  otherwise legacy fallback — non-empty `issues` → **Yes**, else **No**.

## Serve (dashboard)

```python
serve(graph, host="127.0.0.1", port=8787)           # starts Vite UI too
serve(graph, host="127.0.0.1", port=8787, headless=True)  # API only
```

By default (non-headless, blocking), `serve` also runs `npm run dev` in the
q_glass frontend root (Vite console is silenced). It prints — and opens — the
`?adapter=http&api=…` URL. Bare `http://127.0.0.1:5173/` is simulated-only.
Pass `headless=True` / `--headless` for API-only, or `--no-open` to skip the browser.

Stdlib HTTP control plane (CORS enabled for Vite):

| Endpoint | Role |
|----------|------|
| `GET /api/graph` | Internal UI dict |
| `GET /api/session` | Run state |
| `POST /api/session/start` | Batch `run_from` (CLI / API). The dashboard **Start** button auto-steps via `POST /api/session/step` instead so the highlight can move. |
| `POST /api/session/set_start` | `{ "nodeId" }` |
| `POST /api/session/set_stop` | `{ "nodeId" }` |
| `POST /api/session/set_start_input` | `{ "input": {…} }` |
| `POST /api/session/step` | One step via handlers |
| `POST /api/session/clear_start` / `clear_stop` | Reset markers |
| `POST /api/visualize` | Host visualizers: `{ stageId, side, value }` → `ViewSpec` list |

## Visualizers

Register Python plugins before `serve` (see [04-visualizers.md](../docs/04-visualizers.md)):

```python
from q_glass import MarkdownView, register_visualizer, serve

@register_visualizer(id="demo.out", match_stage="export_result", side="out", title="Summary")
def viz(value: object) -> MarkdownView | None:
    if not isinstance(value, dict):
        return None
    return MarkdownView(text=f"artifact=`{value.get('artifact')}`")

serve(graph)
```

Open the UI with:

`http://127.0.0.1:5173/?adapter=http&api=http://127.0.0.1:8787`

(`VITE_Q_GLASS_API` also selects the HTTP adapter.)

## CLI

```bash
python -m q_glass.examples.hello serve              # API + Vite
python -m q_glass.examples.hello serve --headless   # API only
python -m q_glass.examples.hello run --query "…"
python -m q_glass hello serve --port 8787
```

From the repo root, `make demo` is the same as `python -m q_glass.examples.hello serve`
(after install). `make demo-ui` is simulated UI-only (no Python).

## Hello example

[`python/q_glass/examples/hello.py`](../python/q_glass/examples/hello.py) defines
real handlers (accept → fetch → draft → validate → decision → repair/export).
Editing the start `query` changes inspector outputs after **Start**.

## Tests

```bash
cd python && pytest
```

Back to [README](./README.md) · [06-roadmap](./06-roadmap.md).
