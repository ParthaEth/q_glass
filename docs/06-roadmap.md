# 06 — Roadmap

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **P0** | Vite + React Flow scaffold, hello example, JSON inspector, docs | **Done** |
| **P1** | Python API (`GraphBuilder`, `run_*`, `serve`) + real hello + HttpAdapter | **Done** |
| **P2** | Trace dump writer (host) + `TraceDumpAdapter` loader | Planned |
| **P3** | Visualizer plugin registry + host example plugins | Planned |
| **P4** | Subgraph nesting + multi-run browser | Planned |

## P0 acceptance

- `make demo-ui` shows the hello example graph (simulated)
- Node click shows sample I/O
- Simulated Start / Set stop / Step next work

## P1 acceptance

- Hosts define graphs only via Python `GraphBuilder` (JSON not user-facing)
- `python -m q_glass.examples.hello run` executes real handlers
- `make demo` serves Python API + UI; Start shows handler outputs from edited query
- Unit tests cover `run_from`, stop_after, and decision/repair branch

## Host work (outside this repo)

Typical integration lives in the **host** application:

1. Build a `Graph` with `GraphBuilder` from the host stage catalog + edges
2. Call `serve(graph)` (or embed `run_from`) for the dashboard / CLI
3. CI assert executor topology matches the built graph
4. Optional dump writer beside existing artifact dirs

Do not put host product stage catalogs or domain pipelines into this repository.

Back to [README](./README.md) · [00-overview](./00-overview-and-goals.md) · [07-python-api](./07-python-api.md).
