/** Declared execution graph — SSOT for display and (later) run control. */

export type NodeKind = "activity" | "decision" | "subgraph";

export interface GraphNode {
	id: string;
	label: string;
	kind: NodeKind;
	/** Catalog / stop_after stage name when kind === "activity". */
	stageId?: string;
	/** Temporal activity name when kind === "activity". */
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
	stopAfter?: string;
	nodeAttempts: Record<string, NodeAttempt[]>;
	message?: string;
}
