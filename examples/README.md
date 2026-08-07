# Examples

## Hello pipeline (default)

Small declared graph with a decision + repair loop. Uses the in-browser
`SimulatedAdapter` so **Start / Set stop / Step next** work without a real
orchestrator.

### Run

```bash
cd path/to/q_glass
make demo
```

Or:

```bash
npm install
npm run dev:open
```

Then open **http://127.0.0.1:5173/** (Vite may open this automatically).

### Try it

1. Click a node on the graph — it gets a **blue selected** highlight.
2. Click **Set stop** — chip `stop: …` and a dashed stop mark on that node.
3. Click **Start** — run resets and advances until that stage completes, then pauses.
4. **Step next** resumes past the stop, or use **Clear stop**.
5. Without a stop, **Start** only resets to the first stage; use **Step next** to advance one-by-one.
6. Inspector shows sample (then attempt) JSON I/O.

Graph source: [`../src/fixtures/hello-pipeline.sample.json`](../src/fixtures/hello-pipeline.sample.json).
