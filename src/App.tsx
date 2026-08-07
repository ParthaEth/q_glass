import { useCallback, useEffect, useMemo, useState } from "react";

import { HttpAdapter, shouldUseHttpAdapter } from "./adapters/http";
import { SimulatedAdapter } from "./adapters/simulated";
import type { RuntimeAdapter } from "./adapters/types";
import GraphCanvas from "./components/GraphCanvas";
import NodeInspector from "./components/NodeInspector";
import Toolbar from "./components/Toolbar";
import type { GraphDefinition, RunState } from "./types/graph";

function createAdapter(): RuntimeAdapter {
	return shouldUseHttpAdapter() ? new HttpAdapter() : new SimulatedAdapter();
}

const adapter = createAdapter();

export default function App() {
	const [graph, setGraph] = useState<GraphDefinition | null>(null);
	const [run, setRun] = useState<RunState | null>(null);
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [hint, setHint] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const runId = run?.runId ?? "session-1";

	const refreshRun = useCallback(async (opts?: { followCurrent?: boolean }) => {
		const state = await adapter.getRunState(runId);
		setRun(state);
		if (state?.message) setHint(state.message);
		if (opts?.followCurrent && state?.currentNodeId) {
			setSelectedNodeId(state.currentNodeId);
		}
	}, [runId]);

	useEffect(() => {
		void (async () => {
			try {
				const g = await adapter.loadGraph();
				setGraph(g);
				await refreshRun({ followCurrent: true });
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : String(err));
			}
		})();
	}, [refreshRun]);

	const selectedNode = useMemo(() => {
		if (!graph || !selectedNodeId) return null;
		return graph.nodes.find((n) => n.id === selectedNodeId) ?? null;
	}, [graph, selectedNodeId]);

	const completedIds = useMemo(() => {
		if (!run) return new Set<string>();
		return new Set(
			Object.entries(run.nodeAttempts)
				.filter(([, attempts]) => attempts.some((a) => a.status === "completed"))
				.map(([id]) => id),
		);
	}, [run]);

	const onStart = useCallback(() => {
		void adapter.start().then(() => refreshRun({ followCurrent: true }));
	}, [refreshRun]);

	const onSetStart = useCallback(() => {
		if (!selectedNodeId) {
			setHint("Select a node on the graph first, then click Set start.");
			return;
		}
		void adapter.setStart?.(runId, selectedNodeId).then(() => {
			setSelectedNodeId(selectedNodeId);
			void refreshRun();
		});
	}, [selectedNodeId, refreshRun, runId]);

	const onClearStart = useCallback(() => {
		void adapter.clearStart?.(runId).then(() => refreshRun());
	}, [refreshRun, runId]);

	const onStartInputChange = useCallback(
		(value: unknown) => {
			void adapter.setStartInput?.(runId, value).then(() => refreshRun());
		},
		[refreshRun, runId],
	);

	const onSetStop = useCallback(() => {
		if (!selectedNodeId) {
			setHint("Select a node on the graph first, then click Set stop.");
			return;
		}
		void adapter.setStopAfter(runId, selectedNodeId).then(() => {
			void refreshRun();
		});
	}, [selectedNodeId, refreshRun, runId]);

	const onClearStop = useCallback(() => {
		void adapter.clearStop?.(runId).then(() => refreshRun());
	}, [refreshRun, runId]);

	const onStep = useCallback(() => {
		void adapter.step(runId).then(() => refreshRun({ followCurrent: true }));
	}, [refreshRun, runId]);

	if (error) {
		return (
			<div className="qg-app qg-app--error">
				<p>Failed to load graph: {error}</p>
				{adapter.name === "http" ? (
					<p>
						Is the Python API running? Try{" "}
						<code>python -m q_glass.examples.hello serve</code> then open with{" "}
						<code>?adapter=http&amp;api=http://127.0.0.1:8787</code>.
					</p>
				) : null}
			</div>
		);
	}

	if (!graph) {
		return (
			<div className="qg-app qg-app--loading">
				<p>Loading example graph…</p>
			</div>
		);
	}

	return (
		<div className="qg-app">
			<Toolbar
				graphLabel={graph.label}
				adapterName={adapter.name}
				supportsControl={adapter.supportsControl}
				startNodeId={run?.startNodeId ?? null}
				stopAfter={run?.stopAfter ?? null}
				hint={hint}
				onStart={onStart}
				onSetStart={onSetStart}
				onClearStart={onClearStart}
				onSetStop={onSetStop}
				onClearStop={onClearStop}
				onStep={onStep}
			/>
			<main className="qg-main">
				<GraphCanvas
					graph={graph}
					selectedNodeId={selectedNodeId}
					currentNodeId={run?.currentNodeId ?? null}
					startNodeId={run?.startNodeId ?? null}
					stopAfterNodeId={run?.stopAfter ?? null}
					completedNodeIds={completedIds}
					onSelectNode={setSelectedNodeId}
				/>
				<NodeInspector
					node={selectedNode}
					run={run}
					selectedNodeId={selectedNodeId}
					onStartInputChange={onStartInputChange}
				/>
			</main>
		</div>
	);
}
