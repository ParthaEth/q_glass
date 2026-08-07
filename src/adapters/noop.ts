import type { GraphDefinition, RunState } from "../types/graph";
import { AdapterNotWiredError, type RuntimeAdapter } from "./types";
import sampleGraph from "../fixtures/hello-pipeline.sample.json";

/** Stub adapter: serves the hello fixture; control actions throw. */
export class NoopAdapter implements RuntimeAdapter {
	readonly name = "noop";
	readonly supportsControl = false;

	async loadGraph(): Promise<GraphDefinition> {
		return sampleGraph as GraphDefinition;
	}

	async getRunState(_runId: string): Promise<RunState | null> {
		return {
			runId: "demo",
			graphId: (sampleGraph as GraphDefinition).id,
			currentNodeId: "accept_request",
			startNodeId: "accept_request",
			message: "Demo run — control not enabled on NoopAdapter",
			nodeAttempts: {},
		};
	}

	async setStopAfter(_runId: string, _stageId: string): Promise<void> {
		throw new AdapterNotWiredError("setStopAfter");
	}

	async clearStop(_runId: string): Promise<void> {
		throw new AdapterNotWiredError("clearStop");
	}

	async setStart(_runId: string, _stageId: string): Promise<void> {
		throw new AdapterNotWiredError("setStart");
	}

	async clearStart(_runId: string): Promise<void> {
		throw new AdapterNotWiredError("clearStart");
	}

	async setStartInput(_runId: string, _value: unknown): Promise<void> {
		throw new AdapterNotWiredError("setStartInput");
	}

	async step(_runId: string): Promise<void> {
		throw new AdapterNotWiredError("step");
	}

	async start(_input?: unknown): Promise<string> {
		throw new AdapterNotWiredError("start");
	}
}
