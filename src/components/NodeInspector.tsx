import { useEffect, useState } from "react";

import type { GraphNode, RunState } from "../types/graph";
import { resolveVisualType } from "../types/graph";

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
				<h3>Input {isStartNode ? "(editable start)" : last ? "(last attempt)" : "(sample)"}</h3>
				{isStartNode ? (
					<>
						<textarea
							className="qg-json-edit"
							value={draft}
							spellCheck={false}
							onChange={(e) => {
								setDraft(e.target.value);
								setParseError(null);
							}}
							onBlur={applyDraft}
							rows={12}
						/>
						<div className="qg-inspector__row">
							<button type="button" onClick={applyDraft}>
								Apply input
							</button>
							{parseError ? (
								<span className="qg-error">{parseError}</span>
							) : (
								<span className="qg-muted">JSON · blur or Apply</span>
							)}
						</div>
					</>
				) : (
					<pre className="qg-json">
						{JSON.stringify(last?.input ?? node.sampleInput ?? null, null, 2)}
					</pre>
				)}
			</section>
			<section>
				<h3>Output {last ? "(last attempt)" : "(sample)"}</h3>
				<pre className="qg-json">
					{JSON.stringify(last?.output ?? node.sampleOutput ?? null, null, 2)}
				</pre>
			</section>
		</aside>
	);
}
