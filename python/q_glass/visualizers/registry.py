"""In-process registry of host visualizer callables."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Literal

from q_glass.visualizers.specs import ViewSpec, view_spec_to_dict

IoSide = Literal["in", "out", "both"]
VisualizerFn = Callable[[Any], ViewSpec | None]

_REGISTRY: list[RegisteredVisualizer] = []


@dataclass(frozen=True)
class RegisteredVisualizer:
	"""One registered host visualizer."""

	id: str
	match_stage: tuple[str, ...]
	side: IoSide
	title: str
	fn: VisualizerFn


def clear_visualizers() -> None:
	"""Remove all registered visualizers (tests)."""
	_REGISTRY.clear()


def register_visualizer(
	*,
	id: str,
	match_stage: str | list[str] | tuple[str, ...],
	side: IoSide = "both",
	title: str | None = None,
) -> Callable[[VisualizerFn], VisualizerFn]:
	"""Decorator: register a Python visualizer for stage I/O.

	Args:
		id: Stable plugin id (e.g. ``qline.masterTimeline``).
		match_stage: Stage id(s); ``"*"`` matches any stage after specifics.
		side: Which I/O side(s) this visualizer applies to.
		title: Tab label in the inspector (defaults to ``id``).
	"""

	stages = (match_stage,) if isinstance(match_stage, str) else tuple(match_stage)
	if not id:
		raise ValueError("visualizer id must be non-empty")
	if not stages:
		raise ValueError("match_stage must be non-empty")
	label = title or id

	def decorator(fn: VisualizerFn) -> VisualizerFn:
		# Replace existing id so hosts can re-import safely.
		_REGISTRY[:] = [v for v in _REGISTRY if v.id != id]
		_REGISTRY.append(
			RegisteredVisualizer(
				id=id,
				match_stage=stages,
				side=side,
				title=label,
				fn=fn,
			)
		)
		return fn

	return decorator


def _side_matches(registered: IoSide, requested: Literal["in", "out"]) -> bool:
	return registered == "both" or registered == requested


def resolve(
	stage_id: str,
	side: Literal["in", "out"],
) -> list[RegisteredVisualizer]:
	"""Return visualizers matching stage + side (specific stages before ``*``)."""
	specific: list[RegisteredVisualizer] = []
	wildcard: list[RegisteredVisualizer] = []
	for viz in _REGISTRY:
		if not _side_matches(viz.side, side):
			continue
		if stage_id in viz.match_stage:
			specific.append(viz)
		elif "*" in viz.match_stage:
			wildcard.append(viz)
	return specific + wildcard


def render_all(
	stage_id: str,
	side: Literal["in", "out"],
	value: Any,
) -> list[dict[str, Any]]:
	"""Run matching visualizers; soft-fail individuals.

	Returns:
		List of ``{id, title, view}`` dicts. Entries that return ``None`` or
		raise are omitted.
	"""
	results: list[dict[str, Any]] = []
	for viz in resolve(stage_id, side):
		try:
			view = viz.fn(value)
		except Exception:  # noqa: BLE001 — host UI must not break the inspector
			continue
		if view is None:
			continue
		results.append(
			{
				"id": viz.id,
				"title": viz.title,
				"view": view_spec_to_dict(view),
			}
		)
	return results
