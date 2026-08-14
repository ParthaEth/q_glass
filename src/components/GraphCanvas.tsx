import { useCallback, useMemo, useRef, type MouseEvent } from "react";
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
	type ReactFlowInstance,
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
		style: { width, height, pointerEvents: "none" },
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
					className: "nopan nodrag",
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
					zIndex: n.id === selectedNodeId ? 4 : 2,
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
				const label = (e.label ?? "").toLowerCase();
				const yes = label === "yes" || label === "true";
				const no = label === "no" || label === "false";
				const cycle = Boolean(e.cycle);
				const src = graph.nodes.find((n) => n.id === e.source);
				const dst = graph.nodes.find((n) => n.id === e.target);
				const dy = (dst?.position?.y ?? 0) - (src?.position?.y ?? 0);
				const dx = (dst?.position?.x ?? 0) - (src?.position?.x ?? 0);
				// Long same-column No (Has spans? → music): keep a left gutter
				// so the arm never cuts through the spine blocks.
				const leftSkip = no && !cycle && dy > 500;
				// Short Yes that continues down the spine (Has spans? → choose)
				// leaves the diamond bottom; side-branch Yes stays on the right.
				const yesDown = yes && !cycle && dy > 40 && dx < 120;
				// Cycle arms (Yes or No) use the right corridor into `loop`
				// so they stay off the spine. Yes → right; leftSkip → left;
				// short No → bottom; short Yes down the spine → bottom.
				let sourceHandle: string | undefined;
				let targetHandle: string | undefined;
				if (cycle) {
					sourceHandle = "yes";
					targetHandle = "loop";
				} else if (yesDown) {
					sourceHandle = "out";
				} else if (yes) {
					sourceHandle = "yes";
				} else if (leftSkip) {
					sourceHandle = "no";
					targetHandle = "skip";
				} else if (no) {
					sourceHandle = "out";
				}
				return {
					id: e.id,
					source: e.source,
					target: e.target,
					sourceHandle,
					targetHandle,
					label: e.label,
					type: cycle || yes || no ? "smoothstep" : "default",
					pathOptions: leftSkip
						? { borderRadius: 20, offset: 96 }
						: cycle
							? { borderRadius: 16, offset: 28 }
							: { borderRadius: 12 },
					animated: cycle || e.target === currentNodeId,
					interactionWidth: 0,
					style: cycle
						? { stroke: "#c45c26", strokeDasharray: "6 4", pointerEvents: "none" }
						: { pointerEvents: "none" },
					markerEnd: { type: MarkerType.ArrowClosed },
					zIndex: 0,
				};
			}),
		[graph.edges, graph.nodes, currentNodeId],
	);

	const ignoreNextPaneClick = useRef(false);

	const selectStageNode = useCallback(
		(node: Node) => {
			if (String(node.id).startsWith("__group__")) return;
			ignoreNextPaneClick.current = true;
			onSelectNode(node.id);
			window.setTimeout(() => {
				ignoreNextPaneClick.current = false;
			}, 200);
		},
		[onSelectNode],
	);

	const onNodeClick = useCallback(
		(_: MouseEvent, node: Node) => {
			selectStageNode(node);
		},
		[selectStageNode],
	);

	const onPaneClick = useCallback(() => {
		if (ignoreNextPaneClick.current) {
			ignoreNextPaneClick.current = false;
			return;
		}
		onSelectNode(null);
	}, [onSelectNode]);

	const onInit = useCallback((instance: ReactFlowInstance) => {
		void instance.fitView({ padding: 0.15 });
	}, []);

	return (
		<ReactFlow
			nodes={nodes}
			edges={edges}
			nodeTypes={nodeTypes}
			onInit={onInit}
			onNodeClick={onNodeClick}
			onPaneClick={onPaneClick}
			nodesDraggable={false}
			nodesConnectable={false}
			elementsSelectable
			edgesFocusable={false}
			edgesReconnectable={false}
			selectNodesOnDrag={false}
			nodeDragThreshold={0}
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
