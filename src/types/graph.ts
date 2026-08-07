/** Declared execution graph — SSOT for display and (later) run control. */

export type NodeKind = "activity" | "decision" | "subgraph";

/**
 * Flowchart-style shape. If omitted, derived from `kind`:
 * activity → rounded, decision → diamond, subgraph → rect.
 */
export type NodeVisualType = "rounded" | "rect" | "diamond" | "stadium";

export interface GraphNode {
	id: string;
	label: string;
	kind: NodeKind;
	/**
	 * Optional override for how the node is drawn.
	 * Defaults from `kind` when omitted.
	 */
	visualType?: NodeVisualType;
	/** Catalog / stop_after stage name when kind === "activity". */
	stageId?: string;
	/** Executor activity / task name when kind === "activity". */
	activityName?: string;
	/** Optional layout hint for the canvas. */
	position?: { x: number; y: number };
	/** Demo / dump placeholder payloads. */
	sampleInput?: unknown;
	sampleOutput?: unknown;
}

export interface GraphEdge {
	id: string;
	source: string;
	target: string;
	label?: string;
	/** True when this edge closes a repair / feedback loop. */
	cycle?: boolean;
}

export interface GraphDefinition {
	id: string;
	version: string;
	label: string;
	description?: string;
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export type NodeRunStatus =
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "skipped"
	| "unknown";

export interface NodeAttempt {
	attempt: number;
	status: NodeRunStatus;
	input?: unknown;
	output?: unknown;
	error?: string;
}

export interface RunState {
	runId: string;
	graphId: string;
	currentNodeId?: string;
	/** Node where the next Start begins (defaults to graph entry). */
	startNodeId?: string;
	/** Input JSON applied when the start node runs. */
	startInput?: unknown;
	stopAfter?: string;
	nodeAttempts: Record<string, NodeAttempt[]>;
	message?: string;
}

/** Resolve drawable shape from explicit visualType or kind defaults. */
export function resolveVisualType(node: {
	kind: NodeKind;
	visualType?: NodeVisualType;
}): NodeVisualType {
	if (node.visualType) return node.visualType;
	switch (node.kind) {
		case "decision":
			return "diamond";
		case "subgraph":
			return "rect";
		default:
			return "rounded";
	}
}
