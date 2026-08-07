import type { GraphDefinition, RunState } from "../types/graph";

/** Pluggable backend: live orchestrator or offline trace dumps. */
export interface RuntimeAdapter {
	readonly name: string;
	readonly supportsControl: boolean;

	loadGraph(): Promise<GraphDefinition>;
	getRunState(runId: string): Promise<RunState | null>;

	setStopAfter(runId: string, stageId: string): Promise<void>;
	clearStop?(runId: string): Promise<void>;
	setStart?(runId: string, stageId: string): Promise<void>;
	clearStart?(runId: string): Promise<void>;
	setStartInput?(runId: string, value: unknown): Promise<void>;
	step(runId: string): Promise<void>;
	start(input?: unknown): Promise<string>;
}

export class AdapterNotWiredError extends Error {
	constructor(action: string) {
		super(
			`Runtime adapter does not support "${action}" yet. Wire a live adapter or TraceDumpAdapter.`,
		);
		this.name = "AdapterNotWiredError";
	}
}
