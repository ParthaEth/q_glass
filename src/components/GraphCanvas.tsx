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

import type { GraphDefinition, GraphGroup, GraphNode } from "../types/graph";
import { resolveVisualType } from "../types/graph";
import GroupFrame, { type GroupFrameData } from "./GroupFrame";
import StageNode, { type StageNodeData } from "./StageNode";

const nodeTypes: NodeTypes = {
	stage: StageNode,
	groupFrame: GroupFrame,
};

const GROUP_PAD_X = 28;
const GROUP_PAD_TOP = 36;
const GROUP_PAD_BOTTOM = 24;

type Props = {
	graph: GraphDefinition;
	selectedNodeId: string | null;
	currentNodeId: string | null;
	busyNodeId: string | null;
	startNodeId: string | null;
	stopAfterNodeId: string | null;
	completedNodeIds: Set<string>;
	failedNodeIds: Set<string>;
	onSelectNode: (nodeId: string | null) => void;
};

function estimateNodeSize(node: GraphNode): { width: number; height: number } {
	const visual = resolveVisualType(node);
	if (visual === "diamond") {
		return { width: 168, height: 168 };
	}
	return { width: 220, height: 72 };
}

function groupFrameNode(
	group: GraphGroup,
	nodesById: Map<string, GraphNode>,
): Node<GroupFrameData> | null {
	const members = group.members
		.map((id) => nodesById.get(id))
		.filter((n): n is GraphNode => Boolean(n));
	if (members.length === 0) return null;

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const member of members) {
		const pos = member.position ?? { x: 0, y: 0 };
		const size = estimateNodeSize(member);
		minX = Math.min(minX, pos.x);
		minY = Math.min(minY, pos.y);
		maxX = Math.max(maxX, pos.x + size.width);
		maxY = Math.max(maxY, pos.y + size.height);
	}

	const x = minX - GROUP_PAD_X;
	const y = minY - GROUP_PAD_TOP;
	const width = maxX - minX + GROUP_PAD_X * 2;
	const height = maxY - minY + GROUP_PAD_TOP + GROUP_PAD_BOTTOM;

	return {
		id: `__group__${group.id}`,
		type: "groupFrame",
		position: { x, y },
		data: { label: group.label },
		style: { width, height },
		draggable: false,
		selectable: false,
		focusable: false,
		connectable: false,
		zIndex: -1,
	};
}

export default function GraphCanvas({
	graph,
	selectedNodeId,
	currentNodeId,
	busyNodeId,
	startNodeId,
	stopAfterNodeId,
	completedNodeIds,
	failedNodeIds,
	onSelectNode,
}: Props) {
	const stageNodes: Node<StageNodeData>[] = useMemo(
		() =>
			graph.nodes.map((n) => {
				let runStatus: StageNodeData["runStatus"] = "pending";
				if (n.id === busyNodeId) runStatus = "running";
				else if (failedNodeIds.has(n.id)) runStatus = "failed";
				else if (completedNodeIds.has(n.id)) runStatus = "completed";
				else if (n.id === currentNodeId) runStatus = "next";
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
					zIndex: 1,
				};
			}),
		[
			graph.nodes,
			selectedNodeId,
			currentNodeId,
			busyNodeId,
			startNodeId,
			stopAfterNodeId,
			completedNodeIds,
			failedNodeIds,
		],
	);

	const nodes: Node[] = useMemo(() => {
		const byId = new Map(graph.nodes.map((n) => [n.id, n]));
		const frames = (graph.groups ?? [])
			.map((g) => groupFrameNode(g, byId))
			.filter((n): n is Node<GroupFrameData> => n !== null);
		return [...frames, ...stageNodes];
	}, [graph.groups, graph.nodes, stageNodes]);

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
					zIndex: 0,
				};
			}),
		[graph.edges, currentNodeId],
	);

	const onNodeClick = useCallback(
		(_: MouseEvent, node: Node) => {
			if (String(node.id).startsWith("__group__")) return;
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
