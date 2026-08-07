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

	private freshRun(preserveStop?: string): RunState {
		const start = entryNodeId(this.graph);
		const stopAfter = preserveStop;
		return {
			runId: "sim-1",
			graphId: this.graph.id,
			currentNodeId: start,
			stopAfter,
			message: stopAfter
				? `Restarted at "${start}" with stop at "${stopAfter}".`
				: `Simulated run at "${start}". Select a node (blue highlight), Set stop, then Start.`,
			nodeAttempts: {},
		};
	}

	async loadGraph(): Promise<GraphDefinition> {
		return this.graph;
	}

	async getRunState(_runId: string): Promise<RunState | null> {
		return {
			...this.run,
			nodeAttempts: { ...this.run.nodeAttempts },
		};
	}

	/**
	 * Reset to the entry node. Keeps an existing stop breakpoint.
	 * If a stop is set, advances automatically until that stage completes.
	 */
	async start(_input?: unknown): Promise<string> {
		const preservedStop = this.run.stopAfter;
		this.run = this.freshRun(preservedStop);

		if (!preservedStop) {
			return this.run.runId;
		}

		const maxSteps = this.graph.nodes.length + 8;
		for (let i = 0; i < maxSteps; i++) {
			const cur = this.run.currentNodeId;
			if (!cur) break;

			const pausedAtStop =
				this.run.stopAfter === cur &&
				(this.run.nodeAttempts[cur] ?? []).some((a) => a.status === "completed");
			if (pausedAtStop) {
				this.run = {
					...this.run,
					message: `Ran from start until stop at "${cur}". Step next to resume, or Clear stop.`,
				};
				break;
			}

			await this.step(_input as string);
		}

		return this.run.runId;
	}

	async clearStop(_runId: string): Promise<void> {
		this.run = {
			...this.run,
			stopAfter: undefined,
			message: this.run.currentNodeId
				? `Stop cleared. Current: "${this.run.currentNodeId}".`
				: "Stop cleared.",
		};
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
			message: `Stop set at "${node.id}". Click Start to run from the beginning until that stage.`,
		};
	}

	async step(_runId: string): Promise<void> {
		const currentId = this.run.currentNodeId;
		if (!currentId) {
			this.run = {
				...this.run,
				message: "Run finished. Click Start to reset.",
			};
			return;
		}

		const node = this.graph.nodes.find((n) => n.id === currentId);
		if (!node) return;

		const alreadyDone = (this.run.nodeAttempts[currentId] ?? []).some(
			(a) => a.status === "completed",
		);

		// Paused on the stop node after completing it — next Step resumes past it.
		if (alreadyDone && this.run.stopAfter === currentId) {
			const next = nextNodeId(this.graph, currentId);
			this.run = {
				...this.run,
				stopAfter: undefined,
				currentNodeId: next ?? undefined,
				message: next
					? `Resumed past stop → now at "${next}"`
					: `Resumed past stop. Pipeline finished.`,
			};
			return;
		}

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
		if (hitStop) {
			this.run = {
				...this.run,
				nodeAttempts,
				currentNodeId: currentId,
				message: `Stopped after "${currentId}". Step next again to resume, or Clear stop.`,
			};
			return;
		}

		const next = nextNodeId(this.graph, currentId);
		this.run = {
			...this.run,
			nodeAttempts,
			currentNodeId: next ?? undefined,
			message: next
				? `Completed "${currentId}" → now at "${next}"`
				: `Completed "${currentId}". Pipeline finished.`,
		};
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
