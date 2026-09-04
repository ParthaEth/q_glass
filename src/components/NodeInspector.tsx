import { useEffect, useState } from "react";

import type { RuntimeAdapter } from "../adapters/types";
import type { GraphNode, RunState } from "../types/graph";
import { resolveVisualType } from "../types/graph";
import IoPane from "../visualizers/IoPane";

type Props = {
	node: GraphNode | null;
	run: RunState | null;
	selectedNodeId: string | null;
	onStartInputChange: (value: unknown) => void;
	visualize?: RuntimeAdapter["visualize"];
};

export default function NodeInspector({
	node,
	run,
	selectedNodeId,
	onStartInputChange,
	visualize,
}: Props) {
	const isStartNode = Boolean(
		node && run?.startNodeId && node.id === run.startNodeId,
	);
	const [draft, setDraft] = useState("");
	const [parseError, setParseError] = useState<string | null>(null);
	const attempts = selectedNodeId
		? (run?.nodeAttempts[selectedNodeId] ?? [])
		: [];
	const [attemptIndex, setAttemptIndex] = useState(0);

	useEffect(() => {
		if (!node || !isStartNode) return;
		const source = run?.startInput ?? node.sampleInput ?? null;
		setDraft(JSON.stringify(source, null, 2));
		setParseError(null);
	}, [node, isStartNode, run?.startNodeId, run?.startInput]);

	useEffect(() => {
		setAttemptIndex(Math.max(0, attempts.length - 1));
	}, [node?.id, attempts.length]);

	if (!node) {
		return (
			<aside className="qg-inspector">
				<h2>Inspector</h2>
				<p className="qg-muted">
					Select a node. Use Set start, edit its input, then Start.
				</p>
			</aside>
		);
	}

	const last = attempts[attemptIndex];
	const visual = resolveVisualType(node);
	const stageKey = node.stageId ?? node.id;

	const applyDraft = () => {
		try {
			const parsed: unknown = JSON.parse(draft);
			setParseError(null);
			onStartInputChange(parsed);
		} catch (err: unknown) {
			setParseError(err instanceof Error ? err.message : "Invalid JSON");
		}
	};

	const inputValue = last?.input ?? node.sampleInput ?? null;
	const outputValue = last?.output ?? node.sampleOutput ?? null;

	return (
		<aside className="qg-inspector">
			<h2>{node.label}</h2>
			{attempts.length > 1 ? (
				<label className="qg-attempt-select">
					<span>Attempt</span>
					<select
						value={attemptIndex}
						onChange={(event) => setAttemptIndex(Number(event.target.value))}
					>
						{attempts.map((attempt, index) => (
							<option key={`${attempt.attempt}-${index}`} value={index}>
								{attempt.attempt} · {attempt.status}
							</option>
						))}
					</select>
				</label>
			) : null}
			<dl className="qg-meta">
				<div>
					<dt>id</dt>
					<dd>
						<code>{node.id}</code>
					</dd>
				</div>
				<div>
					<dt>kind</dt>
					<dd>
						<code>{node.kind}</code>
					</dd>
				</div>
				<div>
					<dt>visual</dt>
					<dd>
						<code>{visual}</code>
						{node.visualType ? null : (
							<span className="qg-muted"> (from kind)</span>
						)}
					</dd>
				</div>
				{isStartNode ? (
					<div>
						<dt>role</dt>
						<dd>
							<code>start</code>
						</dd>
					</div>
				) : null}
				{node.stageId ? (
					<div>
						<dt>stageId</dt>
						<dd>
							<code>{node.stageId}</code>
						</dd>
					</div>
				) : null}
				{node.activityName ? (
					<div>
						<dt>activity</dt>
						<dd>
							<code>{node.activityName}</code>
						</dd>
					</div>
				) : null}
				{run?.stopAfter ? (
					<div>
						<dt>stopAfter</dt>
						<dd>
							<code>{run.stopAfter}</code>
						</dd>
					</div>
				) : null}
			</dl>

			<section>
				{isStartNode ? (
					<IoPane
						jsonTitle="Input (editable start)"
						value={run?.startInput ?? node.sampleInput ?? null}
						stageId={stageKey}
						nodeId={node.id}
						side="in"
						visualize={visualize}
						editable
						draft={draft}
						onDraftChange={(next) => {
							setDraft(next);
							setParseError(null);
						}}
						onApply={applyDraft}
						parseError={parseError}
					/>
				) : (
					<IoPane
						jsonTitle={last ? "Input (last attempt)" : "Input (sample)"}
						value={inputValue}
						stageId={stageKey}
						nodeId={node.id}
						side="in"
						visualize={visualize}
					/>
				)}
			</section>
			<section>
				<IoPane
					jsonTitle={last ? "Output (last attempt)" : "Output (sample)"}
					value={outputValue}
					stageId={stageKey}
					nodeId={node.id}
					side="out"
					visualize={visualize}
				/>
			</section>
			{last && ((last.steps?.length ?? 0) > 0 || (last.kpis?.length ?? 0) > 0) ? (
				<section>
					<IoPane
						jsonTitle="Steps and KPIs"
						value={{
							startedAt: last.startedAt,
							endedAt: last.endedAt,
							steps: last.steps ?? [],
							kpis: last.kpis ?? [],
						}}
						stageId={stageKey}
						nodeId={node.id}
						side="out"
					/>
				</section>
			) : null}
			{last?.error ? (
				<section>
					<p className="qg-error">Last error: {last.error}</p>
				</section>
			) : null}
		</aside>
	);
}
