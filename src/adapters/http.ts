import type { GraphDefinition, RunState } from "../types/graph";
import type { VisualizeResponse, VisualizerResult } from "../visualizers/types";
import type { RuntimeAdapter } from "./types";

export function apiBase(): string {
	if (typeof window === "undefined") return "http://127.0.0.1:8787";
	const q = new URLSearchParams(window.location.search);
	return (
		q.get("api") ||
		(import.meta.env.VITE_Q_GLASS_API as string | undefined) ||
		"http://127.0.0.1:8787"
	).replace(/\/$/, "");
}

async function getJson<T>(path: string): Promise<T> {
	const res = await fetch(`${apiBase()}${path}`);
	if (!res.ok) {
		throw new Error(`GET ${path} failed: ${res.status}`);
	}
	return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown = {}): Promise<T> {
	const res = await fetch(`${apiBase()}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body ?? {}),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`POST ${path} failed: ${res.status} ${text}`);
	}
	return (await res.json()) as T;
}

/** Talks to `q_glass.serve` — real Python handlers. */
export class HttpAdapter implements RuntimeAdapter {
	readonly name = "http";
	readonly supportsControl = true;

	async loadGraph(): Promise<GraphDefinition> {
		return getJson<GraphDefinition>("/api/graph");
	}

	async getRunState(_runId: string): Promise<RunState | null> {
		return getJson<RunState>("/api/session");
	}

	async setStopAfter(_runId: string, stageId: string): Promise<void> {
		await postJson("/api/session/set_stop", { nodeId: stageId });
	}

	async clearStop(_runId: string): Promise<void> {
		await postJson("/api/session/clear_stop", {});
	}

	async setStart(_runId: string, stageId: string): Promise<void> {
		await postJson("/api/session/set_start", { nodeId: stageId });
	}

	async clearStart(_runId: string): Promise<void> {
		await postJson("/api/session/clear_start", {});
	}

	async setStartInput(_runId: string, value: unknown): Promise<void> {
		await postJson("/api/session/set_start_input", { input: value });
	}

	async step(_runId: string): Promise<void> {
		await postJson("/api/session/step", {});
	}

	async start(input?: unknown): Promise<string> {
		const body =
			input !== undefined ? { startInput: input } : {};
		const state = await postJson<RunState>("/api/session/start", body);
		return state.runId;
	}

	async visualize(args: {
		stageId: string;
		nodeId: string;
		side: "in" | "out";
		value?: unknown;
	}): Promise<VisualizerResult[]> {
		const res = await postJson<VisualizeResponse>("/api/visualize", {
			stageId: args.stageId,
			nodeId: args.nodeId,
			side: args.side,
		});
		return res.visualizers ?? [];
	}
}

export function shouldUseHttpAdapter(): boolean {
	if (typeof window === "undefined") return false;
	const q = new URLSearchParams(window.location.search);
	if (q.get("adapter") === "http") return true;
	if (q.get("adapter") === "simulated") return false;
	return Boolean(import.meta.env.VITE_Q_GLASS_API);
}
