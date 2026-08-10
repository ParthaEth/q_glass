"""Unit tests for Python host visualizer registry + ViewSpec."""

from __future__ import annotations

import json
from typing import Any

import pytest

from q_glass.visualizers import (
	HtmlView,
	MarkdownView,
	TableView,
	TimelineAnchor,
	TimelineView,
	clear_visualizers,
	register_visualizer,
	render_all,
	resolve,
	view_spec_to_dict,
)


@pytest.fixture(autouse=True)
def _clean_registry() -> None:
	clear_visualizers()
	yield
	clear_visualizers()


class TestViewSpecSerialization:
	def test_table_roundtrip_shape(self) -> None:
		view = TableView(columns=["a", "b"], rows=[[1, "x"], [2, "y"]])
		payload = view_spec_to_dict(view)
		assert payload == {
			"kind": "table",
			"columns": ["a", "b"],
			"rows": [[1, "x"], [2, "y"]],
		}

	def test_timeline_anchors(self) -> None:
		view = TimelineView(
			anchors=[
				TimelineAnchor(id="start", t=0.0, label="Begin"),
				TimelineAnchor(id="end", t=10.5),
			],
			duration=10.5,
		)
		payload = view_spec_to_dict(view)
		assert payload["kind"] == "timeline"
		assert payload["duration"] == 10.5
		assert payload["anchors"][0] == {"id": "start", "t": 0.0, "label": "Begin"}
		assert payload["anchors"][1]["label"] is None


class TestRegistryResolve:
	def test_side_and_stage_match(self) -> None:
		@register_visualizer(id="a.out", match_stage="stage_a", side="out", title="A")
		def viz_a(value: Any) -> TableView | None:
			return TableView(columns=["v"], rows=[[value]])

		@register_visualizer(id="a.in", match_stage="stage_a", side="in", title="A in")
		def viz_a_in(value: Any) -> MarkdownView | None:
			return MarkdownView(text=str(value))

		assert [v.id for v in resolve("stage_a", "out")] == ["a.out"]
		assert [v.id for v in resolve("stage_a", "in")] == ["a.in"]
		assert resolve("other", "out") == []

	def test_both_side_and_wildcard(self) -> None:
		@register_visualizer(id="star", match_stage="*", side="both", title="Any")
		def viz_star(value: Any) -> MarkdownView | None:
			return MarkdownView(text="*")

		@register_visualizer(id="specific", match_stage="s1", side="out", title="S1")
		def viz_s1(value: Any) -> MarkdownView | None:
			return MarkdownView(text="s1")

		ids = [v.id for v in resolve("s1", "out")]
		assert ids == ["specific", "star"]
		assert [v.id for v in resolve("other", "in")] == ["star"]

	def test_re_register_replaces_same_id(self) -> None:
		@register_visualizer(id="once", match_stage="x", side="out")
		def first(value: Any) -> MarkdownView | None:
			return MarkdownView(text="first")

		@register_visualizer(id="once", match_stage="x", side="out", title="Second")
		def second(value: Any) -> MarkdownView | None:
			return MarkdownView(text="second")

		matched = resolve("x", "out")
		assert len(matched) == 1
		assert matched[0].title == "Second"
		assert matched[0].fn(None).text == "second"  # type: ignore[union-attr]


class TestRenderAll:
	def test_skips_none_and_errors(self) -> None:
		@register_visualizer(id="ok", match_stage="s", side="out", title="OK")
		def viz_ok(value: Any) -> TableView | None:
			return TableView(columns=["n"], rows=[[1]])

		@register_visualizer(id="skip", match_stage="s", side="out", title="Skip")
		def viz_skip(value: Any) -> None:
			return None

		@register_visualizer(id="boom", match_stage="s", side="out", title="Boom")
		def viz_boom(value: Any) -> HtmlView:
			raise RuntimeError("nope")

		results = render_all("s", "out", {"x": 1})
		assert len(results) == 1
		assert results[0]["id"] == "ok"
		assert results[0]["title"] == "OK"
		assert results[0]["view"]["kind"] == "table"
		# Response must be JSON-serializable for the HTTP bridge.
		json.dumps({"visualizers": results})
