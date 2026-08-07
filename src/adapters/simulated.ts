import type { GraphDefinition, NodeAttempt, RunState } from "../types/graph";
import type { RuntimeAdapter } from "./types";
import helloGraph from "../fixtures/hello-pipeline.sample.json";

/**
 * In-browser example runner: walks a declared graph, supports start/stop/step.
 * Not a real orchestrator — for visualizing q_glass without a cluster.
 */
export class SimulatedAdapter implements RuntimeAdapter {
	readonly name = "simulated";
	readonly supportsControl = true;

	private readonly graph: GraphDefinition;
	private run: RunState;
	private readonly entryId: string;

	constructor() {
		this.graph = helloGraph as GraphDefinition;
		this.entryId = entryNodeId(this.graph);
		this.run = this.freshRun();
	}

	private resolveStartId(explicit?: string): string {
		return explicit ?? this.run.startNodeId ?? this.entryId;
	}

	private defaultStartInput(startId: string): unknown {
		const node = this.graph.nodes.find((n) => n.id === startId);
		return node?.sampleInput ?? null;
	}

	private freshRun(opts?: {
		preserveStop?: string;
		preserveStart?: string;
		preserveStartInput?: unknown;
	}): RunState {
		const startId = opts?.preserveStart ?? this.entryId;
		const startInput =
			opts?.preserveStartInput !== undefined
				? opts.preserveStartInput
				: this.defaultStartInput(startId);
		const stopAfter = opts?.preserveStop;
		return {
			runId: "sim-1",
			graphId: this.graph.id,
			currentNodeId: startId,
			startNodeId: startId,
			startInput,
			stopAfter,
			message: stopAfter
				? `Ready at "${startId}" with stop at "${stopAfter}". Click Start to run.`
				: `Ready at start "${startId}". Edit input in the panel, then Start.`,
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

	async setStart(_runId: string, stageId: string): Promise<void> {
		const node =
			this.graph.nodes.find((n) => n.id === stageId || n.stageId === stageId) ??
			null;
		if (!node) {
			this.run = {
				...this.run,
				message: `Unknown start stage "${stageId}"`,
			};
			return;
		}
		const same = this.run.startNodeId === node.id;
		this.run = {
			...this.run,
			startNodeId: node.id,
			startInput: same
				? (this.run.startInput ?? this.defaultStartInput(node.id))
				: this.defaultStartInput(node.id),
			message: `Start set at "${node.id}". Edit its input, then click Start to run from there.`,
		};
	}

	async clearStart(_runId: string): Promise<void> {
		this.run = {
			...this.run,
			startNodeId: this.entryId,
			startInput: this.defaultStartInput(this.entryId),
			message: `Start cleared → entry "${this.entryId}".`,
		};
	}

	async setStartInput(_runId: string, value: unknown): Promise<void> {
		this.run = {
			...this.run,
			startInput: value,
			message: `Start input updated for "${this.run.startNodeId ?? this.entryId}". Click Start to run.`,
		};
	}

	/**
	 * Reset to the start node (not always graph entry). Keeps stop + start + startInput.
	 * Auto-advances until stop or end.
	 */
	async start(_input?: unknown): Promise<string> {
		const preservedStop = this.run.stopAfter;
		const preservedStart = this.resolveStartId();
		const preservedInput =
			_input !== undefined
				? _input
				: (this.run.startInput ?? this.defaultStartInput(preservedStart));

		this.run = this.freshRun({
			preserveStop: preservedStop,
			preserveStart: preservedStart,
			preserveStartInput: preservedInput,
		});

		const maxSteps = this.graph.nodes.length + 8;
		for (let i = 0; i < maxSteps; i++) {
			const cur = this.run.currentNodeId;
			if (!cur) {
				this.run = {
					...this.run,
					message: `Finished from start "${preservedStart}".`,
				};
				break;
			}

			const pausedAtStop =
				this.run.stopAfter === cur &&
				(this.run.nodeAttempts[cur] ?? []).some((a) => a.status === "completed");
			if (pausedAtStop) {
				this.run = {
					...this.run,
					message: `Ran from "${preservedStart}" until stop at "${cur}".`,
				};
				break;
			}

			await this.step("sim-1");
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
			message: `Stop set at "${node.id}". Click Start to run from start until that stage.`,
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

		const startId = this.run.startNodeId ?? this.entryId;
		const input =
			currentId === startId
				? (this.run.startInput ?? node.sampleInput ?? null)
				: (node.sampleInput ?? null);

		const attempt: NodeAttempt = {
			attempt: (this.run.nodeAttempts[currentId]?.length ?? 0) + 1,
			status: "completed",
			input,
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
