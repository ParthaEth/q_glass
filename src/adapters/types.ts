import type { GraphDefinition, RunState } from "../types/graph";

/** Pluggable backend: live Temporal or offline trace dumps. */
export interface RuntimeAdapter {
	readonly name: string;
	readonly supportsControl: boolean;

	loadGraph(): Promise<GraphDefinition>;
	getRunState(runId: string): Promise<RunState | null>;

	/** Set breakpoint / stop_after. No-op when supportsControl is false. */
	setStopAfter(runId: string, stageId: string): Promise<void>;
	/** Advance one stage (or to next stop). */
	step(runId: string): Promise<void>;
	start(input?: unknown): Promise<string>;
}

export class AdapterNotWiredError extends Error {
	constructor(action: string) {
		super(
			`Runtime adapter does not support "${action}" yet. Wire TemporalAdapter or TraceDumpAdapter.`,
		);
		this.name = "AdapterNotWiredError";
	}
}
