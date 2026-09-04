import {
	Handle,
	Position,
	type Node,
	type NodeProps,
} from "@xyflow/react";

import type { NodeKind, NodeVisualType } from "../types/graph";

export type StageNodeData = {
	nodeId: string;
	label: string;
	kind: NodeKind;
	visualType: NodeVisualType;
	stageId?: string;
	runStatus?: "pending" | "next" | "running" | "completed" | "failed" | "skipped";
	isStop?: boolean;
	isStart?: boolean;
};

function statusBits(data: StageNodeData, selected: boolean) {
	if (selected) return <div className="qg-node__status">selected</div>;
	if (data.isStart) return <div className="qg-node__status">start</div>;
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
		data.runStatus === "next" ? "qg-node--next" : "",
		data.runStatus === "completed" ? "qg-node--completed" : "",
		data.runStatus === "failed" ? "qg-node--failed" : "",
		data.runStatus === "skipped" ? "qg-node--skipped" : "",
		data.isStart ? "qg-node--start" : "",
		data.isStop ? "qg-node--stop" : "",
	]
		.filter(Boolean)
		.join(" ");

	if (visual === "diamond") {
		return (
			<div
				className={`qg-diamond-wrap ${stateClass}`.trim()}
				title={`Stable node id: ${data.nodeId}`}
			>
				<Handle type="target" position={Position.Top} className="qg-handle" />
				<div className="qg-diamond">
					<div className="qg-diamond__face" />
					<div className="qg-diamond__content">
						<div className="qg-node__label">{data.label}</div>
						{statusBits(data, selected)}
					</div>
				</div>
				{/* No / continue down the spine */}
				<Handle
					type="source"
					position={Position.Bottom}
					id="out"
					className="qg-handle"
				/>
				{/* Yes → side branch (or cycle corridor on the right) */}
				<Handle
					type="source"
					position={Position.Right}
					id="yes"
					className="qg-handle"
				/>
				{/* Skip / long No edges route on the left margin */}
				<Handle
					type="source"
					position={Position.Left}
					id="no"
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
		<div
			className={`qg-node ${shapeClass} ${stateClass}`.trim()}
			title={`Stable node id: ${data.nodeId}`}
		>
			{/* Default inbound (no handle id) — keeps linear edges simple */}
			<Handle type="target" position={Position.Top} />
			{/* Long No skips enter from the left margin (e.g. Has spans? → music) */}
			<Handle type="target" position={Position.Left} id="skip" />
			{/* Cycle edges re-enter from the right so loops stay off the spine */}
			<Handle type="target" position={Position.Right} id="loop" />
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
