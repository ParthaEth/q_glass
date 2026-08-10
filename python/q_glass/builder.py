from __future__ import annotations

from typing import Any

from q_glass.graph import EdgeSpec, Graph, GroupSpec, Handler, NodeSpec, VisualType


class GraphBuilder:
	"""Declarative graph construction — the public way to define pipelines."""

	def __init__(
		self,
		graph_id: str,
		*,
		label: str | None = None,
		version: str = "0.1.0",
		description: str = "",
	) -> None:
		self._id = graph_id
		self._label = label or graph_id
		self._version = version
		self._description = description
		self._nodes: dict[str, NodeSpec] = {}
		self._edges: list[EdgeSpec] = []
		self._groups: dict[str, GroupSpec] = {}
		self._edge_i = 0

	def activity(
		self,
		node_id: str,
		handler: Handler,
		*,
		label: str | None = None,
		visual_type: VisualType | None = None,
		sample_input: dict[str, Any] | None = None,
		sample_output: dict[str, Any] | None = None,
		position: dict[str, float] | None = None,
	) -> GraphBuilder:
		self._nodes[node_id] = NodeSpec(
			id=node_id,
			kind="activity",
			label=label or node_id,
			visual_type=visual_type,
			handler=handler,
			sample_input=sample_input,
			sample_output=sample_output,
			position=position,
			stage_id=node_id,
		)
		return self

	def decision(
		self,
		node_id: str,
		*,
		label: str | None = None,
		visual_type: VisualType | None = "diamond",
		sample_input: dict[str, Any] | None = None,
		sample_output: dict[str, Any] | None = None,
		position: dict[str, float] | None = None,
	) -> GraphBuilder:
		self._nodes[node_id] = NodeSpec(
			id=node_id,
			kind="decision",
			label=label or node_id,
			visual_type=visual_type,
			handler=None,
			sample_input=sample_input,
			sample_output=sample_output,
			position=position,
		)
		return self

	def edge(
		self,
		source: str,
		target: str,
		*,
		label: str | None = None,
		cycle: bool = False,
		edge_id: str | None = None,
	) -> GraphBuilder:
		self._edge_i += 1
		eid = edge_id or f"e{self._edge_i}"
		self._edges.append(
			EdgeSpec(id=eid, source=source, target=target, label=label, cycle=cycle)
		)
		return self

	def group(
		self,
		group_id: str,
		members: list[str],
		*,
		label: str | None = None,
	) -> GraphBuilder:
		"""Declare a visual-only bounding box around ``members`` (dashboard only)."""
		if not members:
			raise ValueError(f"Group {group_id!r} requires at least one member")
		if group_id in self._groups:
			raise ValueError(f"Duplicate group id: {group_id}")
		self._groups[group_id] = GroupSpec(
			id=group_id,
			label=label or group_id,
			members=list(members),
		)
		return self

	def build(self) -> Graph:
		if not self._nodes:
			raise ValueError("GraphBuilder requires at least one node")
		for e in self._edges:
			if e.source not in self._nodes:
				raise ValueError(f"Edge source unknown: {e.source}")
			if e.target not in self._nodes:
				raise ValueError(f"Edge target unknown: {e.target}")
		for n in self._nodes.values():
			if n.kind == "activity" and n.handler is None:
				raise ValueError(f"Activity {n.id!r} missing handler")
		for g in self._groups.values():
			for member in g.members:
				if member not in self._nodes:
					raise ValueError(
						f"Group {g.id!r} member unknown: {member}"
					)
		return Graph(
			id=self._id,
			label=self._label,
			version=self._version,
			description=self._description,
			nodes=dict(self._nodes),
			edges=list(self._edges),
			groups=list(self._groups.values()),
		)
