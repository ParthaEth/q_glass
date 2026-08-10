import { useCallback, useMemo, type MouseEvent } from "react";
import {
	Background,
	Controls,
	MiniMap,
	ReactFlow,
	ReactFlowProvider,
	MarkerType,
	useStore,
	type Edge,
	type Node,
	type NodeTypes,
	type ReactFlowState,
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

/** Must match `.qg-node` border-box width in styles.css */
const STAGE_NODE_WIDTH = 260;
const STAGE_NODE_MIN_HEIGHT = 72;
const GROUP_PAD_X = 32;
const GROUP_PAD_TOP = 40;
const GROUP_PAD_BOTTOM = 28;

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

type MeasuredSize = { width: number; height: number };

function estimateNodeSize(node: GraphNode): MeasuredSize {
	const visual = resolveVisualType(node);
	if (visual === "diamond") {
		return { width: 168, height: 168 };
	}
	const labelChars = node.label?.length ?? 0;
	const metaChars = (node.stageId ?? node.id).length;
	// ~32 chars fit per line inside 260px padding box at node font sizes.
	const labelLines = Math.max(1, Math.ceil(labelChars / 32));
	const metaLines = Math.max(1, Math.ceil(metaChars / 36));
	const height = Math.max(
		STAGE_NODE_MIN_HEIGHT,
		16 + labelLines * 18 + 6 + metaLines * 14 + 18,
	);
	return { width: STAGE_NODE_WIDTH, height };
}

function selectMeasuredSizes(state: ReactFlowState): Map<string, MeasuredSize> {
	const out = new Map<string, MeasuredSize>();
	for (const node of state.nodes) {
		if (String(node.id).startsWith("__group__")) continue;
		const width = node.measured?.width ?? node.width;
		const height = node.measured?.height ?? node.height;
		if (typeof width === "number" && typeof height === "number" && width > 0 && height > 0) {
			out.set(node.id, { width, height });
		}
	}
	return out;
}

function measuredKey(measured: Map<string, MeasuredSize>): string {
	return [...measured.entries()]
		.map(([id, size]) => `${id}:${size.width}x${size.height}`)
		.sort()
		.join("|");
}

function groupFrameNode(
	group: GraphGroup,
	nodesById: Map<string, GraphNode>,
	measured: Map<string, MeasuredSize>,
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
		const size = measured.get(member.id) ?? estimateNodeSize(member);
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

function GraphCanvasInner({
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
	const measured = useStore(selectMeasuredSizes, (a, b) => measuredKey(a) === measuredKey(b));
	const measuredSig = measuredKey(measured);

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
			.map((g) => groupFrameNode(g, byId, measured))
			.filter((n): n is Node<GroupFrameData> => n !== null);
		return [...frames, ...stageNodes];
	}, [graph.groups, graph.nodes, measured, measuredSig, stageNodes]);

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
	);
}

export default function GraphCanvas(props: Props) {
	return (
		<div className="qg-canvas">
			<ReactFlowProvider>
				<GraphCanvasInner {...props} />
			</ReactFlowProvider>
		</div>
	);
}
