# 00 — Overview and Goals

## Problem

Long durable workflows are real **state machines**. Operators and authors need:

1. A **graphical overview** that matches the declared stage graph (not opaque
   “step 1 / step 2” blobs).
2. **Stop / step** through stages while inspecting I/O.
3. The same system to run **headless in production**, and to **reload dumps**
   later without workers.

The orchestrator remains the execution engine. q_glass is a **control panel and
glass box**, not a second executor.

## Goals

1. Display a **static `GraphDefinition`** registered by the host (one node per
   work box; decisions and loops as first-class structure).
2. Default **raw JSON** I/O for every stage; allow hosts to attach **custom
   visualizers** (Python → declarative `ViewSpec`; see [04](./04-visualizers.md)).
3. **Live mode**: drive host stop/step/query hooks via a runtime adapter
   (see [03-runtime-adapters.md](./03-runtime-adapters.md)).
4. **Replay mode**: load a [trace dump](./05-trace-dumps.md) with no cluster.
5. Stay usable as a **standalone OSS** tool; hosts integrate via adapters.

## Non-goals

- Replacing the host orchestrator or inventing a new workflow engine
- Auto-deriving the product graph solely from event history
- Shipping domain-specific visualizers or domain pipelines inside core
- Encoding any particular host product’s stage names or business logic in
  fixtures or docs

## Success criteria (v1 scaffold)

- [x] `make demo` opens a React Flow canvas with the hello example graph
- [x] Click node → sample input/output JSON in the inspector
- [x] Simulated Start / Set stop / Step next
- [x] HttpAdapter live Python serve
- [ ] Trace dump loader
- [x] Visualizer plugin registry (Python hosts + generic ViewSpec UI)

## Related

- Architecture: [01-architecture.md](./01-architecture.md)
- Roadmap: [06-roadmap.md](./06-roadmap.md)
- Sample graph: [`../src/fixtures/hello-pipeline.sample.json`](../src/fixtures/hello-pipeline.sample.json)
