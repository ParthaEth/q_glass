import type { GraphDefinition, RunState } from "../types/graph";
import type { RuntimeAdapter } from "./types";


type TraceView = { graph: GraphDefinition; run: RunState };
type TraceViewMessage = { type: "qglass:trace-view"; traceId: string; view: TraceView };

/** Read-only adapter fed by an authenticated parent telemetry page. */
export class OtelTraceAdapter implements RuntimeAdapter {
	readonly name = "otel-trace";
	readonly supportsControl = false;
	private view: TraceView | null = null;
	private readonly listeners = new Set<() => void>();
	private readonly waiters = new Set<(view: TraceView) => void>();

	constructor(readonly traceId: string) {
		window.addEventListener("message", this.onMessage);
		window.parent.postMessage(
			{ type: "qglass:ready", traceId },
			window.location.origin,
		);
	}

	private readonly onMessage = (event: MessageEvent<TraceViewMessage>) => {
		if (event.origin !== window.location.origin || event.source !== window.parent) return;
		if (event.data?.type !== "qglass:trace-view" || event.data.traceId !== this.traceId) return;
		this.view = event.data.view;
		for (const resolve of this.waiters) resolve(event.data.view);
		this.waiters.clear();
		for (const listener of this.listeners) listener();
	};

	private async requireView(): Promise<TraceView> {
		if (this.view) return this.view;
		return new Promise((resolve) => this.waiters.add(resolve));
	}

	async loadGraph(): Promise<GraphDefinition> {
		return (await this.requireView()).graph;
	}

	async getRunState(_runId: string): Promise<RunState | null> {
		return (await this.requireView()).run;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	async setStopAfter(_runId: string, _stageId: string): Promise<void> {
		throw new Error("Historical telemetry traces are read-only");
	}

	async step(_runId: string): Promise<void> {
		throw new Error("Historical telemetry traces are read-only");
	}

	async start(_input?: unknown): Promise<string> {
		throw new Error("Historical telemetry traces are read-only");
	}
}

export function shouldUseOtelTraceAdapter(): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).get("adapter") === "otel-trace";
}

export function otelTraceId(): string {
	if (typeof window === "undefined") return "";
	return new URLSearchParams(window.location.search).get("traceId") ?? "";
}
