from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Literal

Handler = Callable[[dict[str, Any]], dict[str, Any]]
NodeKind = Literal["activity", "decision", "subgraph"]
VisualType = Literal["rounded", "rect", "diamond", "stadium"]


@dataclass
class NodeSpec:
	id: str
	kind: NodeKind
	label: str
	visual_type: VisualType | None = None
	handler: Handler | None = None
	sample_input: dict[str, Any] | None = None
	sample_output: dict[str, Any] | None = None
	position: dict[str, float] | None = None
	stage_id: str | None = None


@dataclass
class EdgeSpec:
	id: str
	source: str
	target: str
	label: str | None = None
	cycle: bool = False


@dataclass
class Graph:
	"""Opaque executable graph. Prefer GraphBuilder; do not hand-author JSON."""

	id: str
	label: str
	version: str = "0.1.0"
	description: str = ""
	nodes: dict[str, NodeSpec] = field(default_factory=dict)
	edges: list[EdgeSpec] = field(default_factory=list)

	def entry_node_id(self) -> str:
		targets = {e.target for e in self.edges}
		roots = [n for n in self.nodes if n not in targets]
		if roots:
			return roots[0]
		return next(iter(self.nodes))

	def resolve_visual_type(self, node: NodeSpec) -> VisualType:
		if node.visual_type:
			return node.visual_type
		if node.kind == "decision":
			return "diamond"
		if node.kind == "subgraph":
			return "rect"
		return "rounded"

	def to_ui_dict(self) -> dict[str, Any]:
		"""Internal wire format for the React dashboard — not the public API."""
		nodes_out: list[dict[str, Any]] = []
		for node in self.nodes.values():
			item: dict[str, Any] = {
				"id": node.id,
				"label": node.label,
				"kind": node.kind,
				"visualType": self.resolve_visual_type(node),
			}
			if node.stage_id or node.kind == "activity":
				item["stageId"] = node.stage_id or node.id
			if node.kind == "activity":
				item["activityName"] = node.id
			if node.position:
				item["position"] = node.position
			if node.sample_input is not None:
				item["sampleInput"] = node.sample_input
			if node.sample_output is not None:
				item["sampleOutput"] = node.sample_output
			nodes_out.append(item)
		edges_out = [
			{
				"id": e.id,
				"source": e.source,
				"target": e.target,
				**({"label": e.label} if e.label else {}),
				**({"cycle": True} if e.cycle else {}),
			}
			for e in self.edges
		]
		return {
			"id": self.id,
			"version": self.version,
			"label": self.label,
			"description": self.description,
			"nodes": nodes_out,
			"edges": edges_out,
		}
