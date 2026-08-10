import { useEffect, useState } from "react";

import type { GraphNode, RunState } from "../types/graph";
import { resolveVisualType } from "../types/graph";
import JsonBlock from "./JsonBlock";

type Props = {
	node: GraphNode | null;
	run: RunState | null;
	selectedNodeId: string | null;
	onStartInputChange: (value: unknown) => void;
};

export default function NodeInspector({
	node,
	run,
	selectedNodeId,
	onStartInputChange,
}: Props) {
	const isStartNode = Boolean(
		node && run?.startNodeId && node.id === run.startNodeId,
	);
	const [draft, setDraft] = useState("");
	const [parseError, setParseError] = useState<string | null>(null);

	useEffect(() => {
		if (!node || !isStartNode) return;
		const source = run?.startInput ?? node.sampleInput ?? null;
		setDraft(JSON.stringify(source, null, 2));
		setParseError(null);
	}, [node, isStartNode, run?.startNodeId, run?.startInput]);

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

	const attempts = selectedNodeId
		? (run?.nodeAttempts[selectedNodeId] ?? [])
		: [];
	const last = attempts[attempts.length - 1];
	const visual = resolveVisualType(node);

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
					<JsonBlock
						title="Input (editable start)"
						value={null}
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
					<JsonBlock
						title={last ? "Input (last attempt)" : "Input (sample)"}
						value={inputValue}
					/>
				)}
			</section>
			<section>
				<JsonBlock
					title={last ? "Output (last attempt)" : "Output (sample)"}
					value={outputValue}
				/>
			</section>
			{last?.error ? (
				<section>
					<p className="qg-error">Last error: {last.error}</p>
				</section>
			) : null}
		</aside>
	);
}
