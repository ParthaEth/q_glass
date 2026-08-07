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

1. Click **Step next** — current node highlights; completed nodes stay marked.
2. Click a later node → **Set stop** → keep stepping until it pauses there.
3. **Start** resets the simulated run.
4. Inspector shows sample (then attempt) JSON I/O.

Graph source: [`../src/fixtures/hello-pipeline.sample.json`](../src/fixtures/hello-pipeline.sample.json).
