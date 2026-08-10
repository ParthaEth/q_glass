"""Host visualizers: Python callables → declarative ViewSpec for the React UI."""

from __future__ import annotations

from q_glass.visualizers.registry import (
	RegisteredVisualizer,
	clear_visualizers,
	register_visualizer,
	render_all,
	resolve,
)
from q_glass.visualizers.specs import (
	HtmlView,
	MarkdownView,
	TableView,
	TimelineAnchor,
	TimelineView,
	ViewSpec,
	view_spec_to_dict,
)

__all__ = [
	"HtmlView",
	"MarkdownView",
	"RegisteredVisualizer",
	"TableView",
	"TimelineAnchor",
	"TimelineView",
	"ViewSpec",
	"clear_visualizers",
	"register_visualizer",
	"render_all",
	"resolve",
	"view_spec_to_dict",
]
