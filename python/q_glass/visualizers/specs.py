"""Declarative view specs rendered by generic q_glass React widgets."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal, Union


@dataclass(frozen=True)
class TableView:
	"""Simple table: column headers + row cells."""

	columns: list[str]
	rows: list[list[Any]] = field(default_factory=list)
	kind: Literal["table"] = "table"


@dataclass(frozen=True)
class TimelineAnchor:
	"""One labeled point on a timeline."""

	id: str
	t: float
	label: str | None = None


@dataclass(frozen=True)
class TimelineView:
	"""Ordered anchors on a shared clock."""

	anchors: list[TimelineAnchor] = field(default_factory=list)
	duration: float | None = None
	kind: Literal["timeline"] = "timeline"


@dataclass(frozen=True)
class MarkdownView:
	"""Lightweight markdown text (host-authored; keep payloads small)."""

	text: str
	kind: Literal["markdown"] = "markdown"


@dataclass(frozen=True)
class HtmlView:
	"""Escape hatch: HTML shown in a sandboxed iframe."""

	html: str
	kind: Literal["html"] = "html"


ViewSpec = Union[TableView, TimelineView, MarkdownView, HtmlView]


def view_spec_to_dict(view: ViewSpec) -> dict[str, Any]:
	"""Serialize a ViewSpec for the ``/api/visualize`` response."""
	payload = asdict(view)
	if isinstance(view, TimelineView):
		payload["anchors"] = [
			{"id": a.id, "t": a.t, "label": a.label} for a in view.anchors
		]
	return payload
