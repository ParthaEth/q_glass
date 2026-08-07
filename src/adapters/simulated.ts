import type { GraphDefinition, NodeAttempt, RunState } from "../types/graph";
import type { RuntimeAdapter } from "./types";
import helloGraph from "../fixtures/hello-pipeline.sample.json";

/**
 * In-browser example runner: walks a declared graph, supports stop/step.
 * Not a real orchestrator — for visualizing q_glass without a cluster.
 */
export class SimulatedAdapter implements RuntimeAdapter {
	readonly name = "simulated";
	readonly supportsControl = true;

	private readonly graph: GraphDefinition;
	private run: RunState;

	constructor() {
		this.graph = helloGraph as GraphDefinition;
		this.run = this.freshRun();
	}

	private freshRun(): RunState {
		const start = entryNodeId(this.graph);
		return {
			runId: "sim-1",
			graphId: this.graph.id,
			currentNodeId: start,
			stopAfter: undefined,
			message: `Simulated run at "${start}". Click Step next.`,
			nodeAttempts: {},
		};
	}

	async loadGraph(): Promise<GraphDefinition> {
		return this.graph;
	}

	async getRunState(_runId: string): Promise<RunState | null> {
		return { ...this.run, nodeAttempts: { ...this.run.nodeAttempts } };
	}

	async start(_input?: unknown): Promise<string> {
		this.run = this.freshRun();
		return this.run.runId;
	}

	async setStopAfter(_runId: string, stageId: string): Promise<void> {
		const node =
			this.graph.nodes.find((n) => n.id === stageId || n.stageId === stageId) ??
			null;
		if (!node) {
			this.run = {
				...this.run,
				message: `Unknown stop stage "${stageId}"`,
			};
			return;
		}
		this.run = {
			...this.run,
			stopAfter: node.id,
			message: `Stop after "${node.id}". Step until that node completes.`,
		};
	}

	async step(_runId: string): Promise<void> {
		const currentId = this.run.currentNodeId;
		if (!currentId) {
			this.run = { ...this.run, message: "Run finished. Click Start to reset." };
			return;
		}

		const node = this.graph.nodes.find((n) => n.id === currentId);
		if (!node) return;

		const attempt: NodeAttempt = {
			attempt: (this.run.nodeAttempts[currentId]?.length ?? 0) + 1,
			status: "completed",
			input: node.sampleInput ?? null,
			output: node.sampleOutput ?? null,
		};

		const nodeAttempts = {
			...this.run.nodeAttempts,
			[currentId]: [...(this.run.nodeAttempts[currentId] ?? []), attempt],
		};

		const hitStop = this.run.stopAfter === currentId;
		const next = hitStop ? null : nextNodeId(this.graph, currentId);

		this.run = {
			...this.run,
			nodeAttempts,
			currentNodeId: next ?? undefined,
			message: hitStop
				? `Stopped after "${currentId}". Clear stop or Start to continue.`
				: next
					? `Completed "${currentId}" → now at "${next}"`
					: `Completed "${currentId}". Pipeline finished.`,
		};

		if (hitStop) {
			this.run = { ...this.run, stopAfter: undefined };
		}
	}
}

/** Prefer the happy path at decisions (edge label "No"); skip cycle edges. */
function nextNodeId(graph: GraphDefinition, fromId: string): string | null {
	const outs = graph.edges.filter((e) => e.source === fromId && !e.cycle);
	if (outs.length === 0) return null;
	const no = outs.find((e) => (e.label ?? "").toLowerCase() === "no");
	return (no ?? outs[0]).target;
}

function entryNodeId(graph: GraphDefinition): string {
	const targets = new Set(graph.edges.map((e) => e.target));
	const roots = graph.nodes.filter((n) => !targets.has(n.id));
	return roots[0]?.id ?? graph.nodes[0]?.id ?? "";
}
