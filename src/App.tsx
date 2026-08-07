import { useCallback, useEffect, useMemo, useState } from "react";

import { SimulatedAdapter } from "./adapters/simulated";
import GraphCanvas from "./components/GraphCanvas";
import NodeInspector from "./components/NodeInspector";
import Toolbar from "./components/Toolbar";
import type { GraphDefinition, RunState } from "./types/graph";

const adapter = new SimulatedAdapter();

export default function App() {
	const [graph, setGraph] = useState<GraphDefinition | null>(null);
	const [run, setRun] = useState<RunState | null>(null);
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [hint, setHint] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const refreshRun = useCallback(async (opts?: { followCurrent?: boolean }) => {
		const state = await adapter.getRunState("sim-1");
		setRun(state);
		if (state?.message) setHint(state.message);
		if (opts?.followCurrent && state?.currentNodeId) {
			setSelectedNodeId(state.currentNodeId);
		}
	}, []);

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

	const onSetStop = useCallback(() => {
		if (!selectedNodeId) {
			setHint("Select a node on the graph first, then click Set stop.");
			return;
		}
		void adapter.setStopAfter("sim-1", selectedNodeId).then(() => {
			void refreshRun();
		});
	}, [selectedNodeId, refreshRun]);

	const onClearStop = useCallback(() => {
		void adapter.clearStop("sim-1").then(() => refreshRun());
	}, [refreshRun]);

	const onStep = useCallback(() => {
		void adapter.step("sim-1").then(() => refreshRun({ followCurrent: true }));
	}, [refreshRun]);

	if (error) {
		return (
			<div className="qg-app qg-app--error">
				<p>Failed to load graph: {error}</p>
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
				stopAfter={run?.stopAfter ?? null}
				hint={hint}
				onStart={onStart}
				onSetStop={onSetStop}
				onClearStop={onClearStop}
				onStep={onStep}
			/>
			<main className="qg-main">
				<GraphCanvas
					graph={graph}
					selectedNodeId={selectedNodeId}
					currentNodeId={run?.currentNodeId ?? null}
					stopAfterNodeId={run?.stopAfter ?? null}
					completedNodeIds={completedIds}
					onSelectNode={setSelectedNodeId}
				/>
				<NodeInspector
					node={selectedNode}
					run={run}
					selectedNodeId={selectedNodeId}
				/>
			</main>
		</div>
	);
}
