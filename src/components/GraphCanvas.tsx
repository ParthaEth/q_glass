import { useCallback, useMemo, type MouseEvent } from "react";
import {
	Background,
	Controls,
	MiniMap,
	ReactFlow,
	MarkerType,
	type Edge,
	type Node,
	type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { GraphDefinition } from "../types/graph";
import { resolveVisualType } from "../types/graph";
import StageNode, { type StageNodeData } from "./StageNode";

const nodeTypes: NodeTypes = {
	stage: StageNode,
};

type Props = {
	graph: GraphDefinition;
	selectedNodeId: string | null;
	currentNodeId: string | null;
	startNodeId: string | null;
	stopAfterNodeId: string | null;
	completedNodeIds: Set<string>;
	onSelectNode: (nodeId: string | null) => void;
};

export default function GraphCanvas({
	graph,
	selectedNodeId,
	currentNodeId,
	startNodeId,
	stopAfterNodeId,
	completedNodeIds,
	onSelectNode,
}: Props) {
	const nodes: Node<StageNodeData>[] = useMemo(
		() =>
			graph.nodes.map((n) => {
				let runStatus: StageNodeData["runStatus"] = "pending";
				if (n.id === currentNodeId) runStatus = "running";
				else if (completedNodeIds.has(n.id)) runStatus = "completed";
				return {
					id: n.id,
					type: "stage",
					position: n.position ?? { x: 0, y: 0 },
					data: {
						label: n.label,
						kind: n.kind,
						visualType: resolveVisualType(n),
						stageId: n.stageId,
						runStatus,
						isStart: n.id === startNodeId,
						isStop: n.id === stopAfterNodeId,
					},
					selected: n.id === selectedNodeId,
				};
			}),
		[
			graph.nodes,
			selectedNodeId,
			currentNodeId,
			startNodeId,
			stopAfterNodeId,
			completedNodeIds,
		],
	);

	const edges: Edge[] = useMemo(
		() =>
			graph.edges.map((e) => {
				const yes =
					(e.label ?? "").toLowerCase() === "yes" ||
					(e.label ?? "").toLowerCase() === "true";
				return {
					id: e.id,
					source: e.source,
					target: e.target,
					sourceHandle: yes ? "yes" : undefined,
					label: e.label,
					animated: Boolean(e.cycle) || e.target === currentNodeId,
					style: e.cycle
						? { stroke: "#c45c26", strokeDasharray: "6 4" }
						: undefined,
					markerEnd: { type: MarkerType.ArrowClosed },
				};
			}),
		[graph.edges, currentNodeId],
	);

	const onNodeClick = useCallback(
		(_: MouseEvent, node: Node) => {
			onSelectNode(node.id);
		},
		[onSelectNode],
	);

	const onPaneClick = useCallback(() => {
		onSelectNode(null);
	}, [onSelectNode]);

	return (
		<div className="qg-canvas">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				onNodeClick={onNodeClick}
				onPaneClick={onPaneClick}
				fitView
				fitViewOptions={{ padding: 0.15 }}
				minZoom={0.2}
				proOptions={{ hideAttribution: true }}
			>
				<Background gap={18} size={1} />
				<Controls />
				<MiniMap pannable zoomable />
			</ReactFlow>
		</div>
	);
}
