"""q_glass — build graphs in Python; JSON is an internal detail."""

from __future__ import annotations

from q_glass.builder import GraphBuilder
from q_glass.graph import Graph
from q_glass.runtime import RunResult, Session, run_from, run_node
from q_glass.serve import serve
from q_glass.visualizers import (
	HtmlView,
	MarkdownView,
	TableView,
	TimelineAnchor,
	TimelineTrack,
	TimelineView,
	TrackSegment,
	TracksTimelineView,
	register_visualizer,
	render_all,
)

__all__ = [
	"Graph",
	"GraphBuilder",
	"HtmlView",
	"MarkdownView",
	"RunResult",
	"Session",
	"TableView",
	"TimelineAnchor",
	"TimelineTrack",
	"TimelineView",
	"TrackSegment",
	"TracksTimelineView",
	"register_visualizer",
	"render_all",
	"run_from",
	"run_node",
	"serve",
]

__version__ = "0.2.0"
