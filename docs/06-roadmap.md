# 06 — Roadmap

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **P0** | Vite + React Flow scaffold, hello example, JSON inspector, docs | **Done** |
| **P1** | Live orchestrator adapter (stop/step/overview) | Planned |
| **P2** | Trace dump writer (host) + `TraceDumpAdapter` loader | Planned |
| **P3** | Visualizer plugin registry + host example plugins | Planned |
| **P4** | Subgraph nesting + multi-run browser | Planned |

## P0 acceptance

- `make demo` shows the hello example graph
- Node click shows sample I/O
- Simulated Start / Set stop / Step next work

## Host work (outside this repo)

Typical integration lives in the **host** application:

1. Export `GraphDefinition` from the host stage catalog + edges
2. Thin adapter package mapping stop/step/queries
3. CI assert executor topology matches the exported graph
4. Optional dump writer beside existing artifact dirs

Do not put host product stage catalogs or domain pipelines into this repository.

Back to [README](./README.md) · [00-overview](./00-overview-and-goals.md).
