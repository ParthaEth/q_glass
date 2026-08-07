# q_glass (Python)

Build and run declared stage graphs from Python. Graph JSON is an internal
detail used by the React dashboard — hosts author graphs with `GraphBuilder`.

## Install

```bash
cd python
pip install -e ".[dev]"
```

## Hello demo

```bash
# Run handlers once on the CLI
python -m q_glass.examples.hello run --query "My question"

# Serve HTTP API for the React HttpAdapter (port 8787)
python -m q_glass.examples.hello serve

# From the q_glass repo root (API + Vite)
make demo
```

Then open:

`http://127.0.0.1:5173/?adapter=http&api=http://127.0.0.1:8787`

## Library sketch

```python
from q_glass import GraphBuilder, run_from, serve

def accept(inp: dict) -> dict:
	return {"job_id": "hello-1", "query": inp.get("query", "")}

b = GraphBuilder("demo.v1", label="Demo")
b.activity("accept_request", accept, visual_type="stadium", sample_input={"query": "…"})
graph = b.build()

run_from(graph, start="accept_request", input={"query": "hello"})
# serve(graph, port=8787)
```

See [docs/07-python-api.md](../docs/07-python-api.md).
