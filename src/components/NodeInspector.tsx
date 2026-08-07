import type { GraphNode, RunState } from "../types/graph";
import { resolveVisualType } from "../types/graph";

type Props = {
	node: GraphNode | null;
	run: RunState | null;
	selectedNodeId: string | null;
};

export default function NodeInspector({ node, run, selectedNodeId }: Props) {
	if (!node) {
		return (
			<aside className="qg-inspector">
				<h2>Inspector</h2>
				<p className="qg-muted">Select a node to view sample I/O JSON.</p>
			</aside>
		);
	}

	const attempts = selectedNodeId
		? (run?.nodeAttempts[selectedNodeId] ?? [])
		: [];
	const last = attempts[attempts.length - 1];
	const visual = resolveVisualType(node);

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
				<h3>Input {last ? "(last attempt)" : "(sample)"}</h3>
				<pre className="qg-json">
					{JSON.stringify(last?.input ?? node.sampleInput ?? null, null, 2)}
				</pre>
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
