import {
	Handle,
	Position,
	type Node,
	type NodeProps,
} from "@xyflow/react";

export type StageNodeData = {
	label: string;
	kind: "activity" | "decision" | "subgraph";
	stageId?: string;
	runStatus?: "pending" | "running" | "completed";
};

function StageNode({ data }: NodeProps<Node<StageNodeData>>) {
	const isDecision = data.kind === "decision";
	const className = [
		"qg-node",
		isDecision ? "qg-node--decision" : "qg-node--activity",
		data.runStatus === "running" ? "qg-node--running" : "",
		data.runStatus === "completed" ? "qg-node--completed" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={className}>
			<Handle type="target" position={Position.Top} />
			<div className="qg-node__label">{data.label}</div>
			{data.stageId ? (
				<div className="qg-node__meta">{data.stageId}</div>
			) : null}
			{data.runStatus && data.runStatus !== "pending" ? (
				<div className="qg-node__status">{data.runStatus}</div>
			) : null}
			<Handle type="source" position={Position.Bottom} />
		</div>
	);
}

export default StageNode;
