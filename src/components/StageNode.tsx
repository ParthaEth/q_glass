import {
	Handle,
	Position,
	type Node,
	type NodeProps,
} from "@xyflow/react";

import type { NodeKind, NodeVisualType } from "../types/graph";

export type StageNodeData = {
	label: string;
	kind: NodeKind;
	visualType: NodeVisualType;
	stageId?: string;
	runStatus?: "pending" | "running" | "completed";
	isStop?: boolean;
};

function statusBits(data: StageNodeData, selected: boolean) {
	if (selected) return <div className="qg-node__status">selected</div>;
	if (data.isStop) return <div className="qg-node__status">stop</div>;
	if (data.runStatus && data.runStatus !== "pending") {
		return <div className="qg-node__status">{data.runStatus}</div>;
	}
	return null;
}

function StageNode({ data, selected }: NodeProps<Node<StageNodeData>>) {
	const visual = data.visualType;
	const stateClass = [
		selected ? "qg-node--selected" : "",
		data.runStatus === "running" ? "qg-node--running" : "",
		data.runStatus === "completed" ? "qg-node--completed" : "",
		data.isStop ? "qg-node--stop" : "",
	]
		.filter(Boolean)
		.join(" ");

	if (visual === "diamond") {
		return (
			<div className={`qg-diamond-wrap ${stateClass}`.trim()}>
				<Handle type="target" position={Position.Top} className="qg-handle" />
				<div className="qg-diamond">
					<div className="qg-diamond__face" />
					<div className="qg-diamond__content">
						<div className="qg-node__label">{data.label}</div>
						{statusBits(data, selected)}
					</div>
				</div>
				<Handle
					type="source"
					position={Position.Bottom}
					id="out"
					className="qg-handle"
				/>
				<Handle
					type="source"
					position={Position.Right}
					id="yes"
					className="qg-handle"
				/>
			</div>
		);
	}

	const shapeClass =
		visual === "stadium"
			? "qg-node--stadium"
			: visual === "rect"
				? "qg-node--rect"
				: "qg-node--rounded";

	return (
		<div className={`qg-node ${shapeClass} ${stateClass}`.trim()}>
			<Handle type="target" position={Position.Top} />
			<div className="qg-node__label">{data.label}</div>
			{data.stageId ? (
				<div className="qg-node__meta">{data.stageId}</div>
			) : null}
			{statusBits(data, selected)}
			<Handle type="source" position={Position.Bottom} />
		</div>
	);
}

export default StageNode;
