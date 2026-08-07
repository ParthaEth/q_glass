"""Unit tests for GraphBuilder + runtime (no network)."""

from __future__ import annotations

import pytest

from q_glass.examples.hello import build_hello_graph
from q_glass.runtime import run_from, run_node


class TestHelloRuntime:
	def test_run_from_preserves_custom_query(self) -> None:
		graph = build_hello_graph()
		query = "custom hello query XYZ"
		result = run_from(
			graph,
			start="accept_request",
			input={"query": query},
		)
		assert result.final_output is not None
		assert result.final_output["query"] == query
		assert result.final_output["plan"] == ["collect", "analyze", "write"]
		assert result.final_output.get("artifact") == "result.json"
		assert "export_result" in result.path
		assert result.stopped_after is None

	def test_stop_after_pauses(self) -> None:
		graph = build_hello_graph()
		result = run_from(
			graph,
			start="accept_request",
			input={"query": "pause me"},
			stop_after="draft_plan",
		)
		assert result.stopped_after == "draft_plan"
		assert result.path[-1] == "draft_plan"
		assert "validate_plan" not in result.path
		assert result.final_output is not None
		assert result.final_output["query"] == "pause me"
		assert result.final_output["plan"] == ["collect", "analyze", "write"]

	def test_empty_query_takes_repair_branch(self) -> None:
		graph = build_hello_graph()
		result = run_from(
			graph,
			start="accept_request",
			input={"query": ""},
		)
		assert "repair" in result.path
		assert result.final_output is not None
		assert result.final_output["plan"] == ["collect", "analyze", "write"]
		assert result.final_output.get("ok") is True
		# validate → decision → repair → validate → decision → export
		assert result.path.count("validate_plan") >= 2

	def test_happy_path_skips_repair(self) -> None:
		graph = build_hello_graph()
		result = run_from(
			graph,
			start="accept_request",
			input={"query": "ok"},
		)
		assert "repair" not in result.path
		assert result.path[-1] == "export_result"

	def test_run_node_decision_passthrough(self) -> None:
		graph = build_hello_graph()
		payload = {"issues": ["empty_plan"], "plan": []}
		out = run_node(graph, "has_issues", payload)
		assert out == payload


class TestBuilder:
	def test_to_ui_dict_shape(self) -> None:
		graph = build_hello_graph()
		ui = graph.to_ui_dict()
		assert ui["id"] == "q_glass.hello.v1"
		assert len(ui["nodes"]) == 7
		assert any(n["id"] == "has_issues" and n["kind"] == "decision" for n in ui["nodes"])
		assert any(e.get("cycle") for e in ui["edges"])

	def test_unknown_edge_rejected(self) -> None:
		from q_glass import GraphBuilder

		b = GraphBuilder("bad")
		b.activity("a", lambda inp: inp)
		b.edge("a", "missing")
		with pytest.raises(ValueError, match="Edge target unknown"):
			b.build()

	def test_empty_graph_rejected(self) -> None:
		from q_glass import GraphBuilder

		with pytest.raises(ValueError, match="at least one node"):
			GraphBuilder("empty").build()


class TestServeUiRoot:
	def test_find_ui_root(self) -> None:
		from q_glass.serve import find_ui_root

		root = find_ui_root()
		assert root is not None
		assert (root / "package.json").is_file()
		assert (root / "src" / "App.tsx").is_file()
