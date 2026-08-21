"""Declarative visualizer view specs for Python hosts."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal, Union


@dataclass(frozen=True)
class TableView:
	"""Simple table rendering."""

	columns: list[str]
	rows: list[list[object]]
	kind: Literal["table"] = "table"


@dataclass(frozen=True)
class TimelineAnchor:
	"""Point-in-time marker for event timelines."""

	id: str
	t: float
	label: str | None = None


@dataclass(frozen=True)
class TimelineView:
	"""Single-rail timeline with anchors."""

	anchors: list[TimelineAnchor]
	duration: float | None = None
	kind: Literal["timeline"] = "timeline"


@dataclass(frozen=True)
class TrackSegment:
	"""One placed segment in a track timeline."""

	id: str
	start: float
	end: float
	label: str | None = None
	resource_id: str | None = None
	kind: str | None = None
	source_from: str | None = None
	source_until: str | None = None
	color: str | None = None


@dataclass(frozen=True)
class TimelineTrack:
	"""A non-editable track row with segment placements."""

	id: str
	label: str
	segments: list[TrackSegment]
	kind: str | None = None


@dataclass(frozen=True)
class TracksTimelineView:
	"""Multi-track timeline akin to NLE row layout."""

	tracks: list[TimelineTrack]
	duration: float | None = None
	anchors: list[TimelineAnchor] | None = None
	kind: Literal["tracks_timeline"] = "tracks_timeline"


@dataclass(frozen=True)
class MarkdownView:
	"""Rendered as markdown in the inspector."""

	text: str
	kind: Literal["markdown"] = "markdown"


@dataclass(frozen=True)
class HtmlView:
	"""Rendered as sandboxed iframe ``srcDoc``."""

	html: str
	kind: Literal["html"] = "html"


@dataclass(frozen=True)
class VideoView:
	"""Video player backed by an HTTPS URL or a host-local media path.

	``serve()`` replaces an existing local path with an opaque media endpoint
	before it reaches the browser. HTTP(S) URLs are rendered directly.
	"""

	source: str
	label: str | None = None
	kind: Literal["video"] = "video"


ViewSpec = Union[
	TableView,
	TimelineView,
	TracksTimelineView,
	MarkdownView,
	HtmlView,
	VideoView,
]


def view_spec_to_dict(view: ViewSpec) -> dict:
	"""Convert dataclass view specs to JSON-safe dict payloads."""
	return asdict(view)
