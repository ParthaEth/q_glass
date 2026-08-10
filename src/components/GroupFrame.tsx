import type { Node, NodeProps } from "@xyflow/react";

export type GroupFrameData = {
	label: string;
};

/** Non-interactive bounding box + title for a declared visual group. */
export default function GroupFrame({ data }: NodeProps<Node<GroupFrameData>>) {
	return (
		<div className="qg-group">
			<div className="qg-group__label">{data.label}</div>
		</div>
	);
}
