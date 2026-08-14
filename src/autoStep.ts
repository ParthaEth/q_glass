import type { RunState } from "./types/graph";

export type AutoStepHalt = "finished" | "failed" | "stopped";

/** Whether an auto-Start loop should stop after this session snapshot. */
export function autoStepHaltReason(state: RunState | null): AutoStepHalt | null {
	if (!state) {
		return "finished";
	}
	const failed = Object.values(state.nodeAttempts).some((attempts) => {
		const last = attempts[attempts.length - 1];
		return last?.status === "failed";
	});
	if (failed) {
		return "failed";
	}
	if (!state.currentNodeId) {
		return "finished";
	}
	const stop = state.stopAfter;
	const cur = state.currentNodeId;
	if (stop && cur === stop) {
		const last = state.nodeAttempts[cur]?.[state.nodeAttempts[cur].length - 1];
		if (last?.status === "completed") {
			return "stopped";
		}
	}
	return null;
}

export function autoStepMaxIterations(nodeCount: number): number {
	return Math.max(nodeCount * 12, 64);
}

/** True when a run is parked mid-graph (stop, failure, or after some steps). */
export function canContinue(state: RunState | null): boolean {
	if (!state?.currentNodeId) {
		return false;
	}
	return Object.values(state.nodeAttempts).some((attempts) => attempts.length > 0);
}
