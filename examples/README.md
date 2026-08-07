# Examples

## Hello pipeline (default)

Small declared graph with a decision + repair loop. Uses the in-browser
`SimulatedAdapter` so **Start / Set start / Set stop / Step next** work without
a real orchestrator.

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

1. Click a node — blue **selected** highlight.
2. **Set start** — chip `start: …` marks where the run begins (default = graph entry).
3. With the start node selected, edit **Input** JSON in the right panel → **Apply input** (or blur).
4. Optionally **Set stop** on a later node.
5. **Start** — runs from the start node (with your input) until stop or the end.
6. **Step next** advances one stage (or resumes past a stop). **Clear start** / **Clear stop** reset those markers.

Graph source: [`../src/fixtures/hello-pipeline.sample.json`](../src/fixtures/hello-pipeline.sample.json).
