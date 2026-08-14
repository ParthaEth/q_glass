"""RuntimeSession step error handling + set_start cursor behavior."""

from __future__ import annotations

from q_glass import GraphBuilder
from q_glass.runtime import RuntimeSession


def _boom(_inp: dict) -> dict:
	raise RuntimeError("OPENAI_API_KEY is not configured")


def _linear_graph():
	builder = GraphBuilder("step.start.v1")

	def stage_a(inp: dict) -> dict:
		if "brief" not in inp:
			raise ValueError("brief must be an object with prompt_text")
		return {**inp, "stage": "a"}

	def stage_b(inp: dict) -> dict:
		return {**inp, "stage": "b", "ok": True}

	def stage_c(inp: dict) -> dict:
		return {**inp, "stage": "c"}

	builder.activity("a", stage_a, sample_input={"brief": {"prompt_text": "hi"}})
	builder.activity(
		"b", stage_b, sample_input={"brief": {"prompt_text": "hi"}, "from": "b"}
	)
	builder.activity("c", stage_c)
	builder.edge("a", "b")
	builder.edge("b", "c")
	return builder.build()


def test_step_records_failure_without_500() -> None:
	b = GraphBuilder("fail.v1")
	b.activity("fail_node", _boom)
	graph = b.build()
	session = RuntimeSession(graph)
	session.session.start_input = {}
	state = session.step()
	assert "Failed at" in state["message"]
	attempts = state["nodeAttempts"]["fail_node"]
	assert attempts[-1]["status"] == "failed"
	assert "OPENAI" in attempts[-1]["error"]


def test_set_start_then_step_begins_at_start_not_entry() -> None:
	"""Regression: Step used to run graph entry even when start was mid-graph."""
	graph = _linear_graph()
	session = RuntimeSession(graph)
	assert session.get_state()["currentNodeId"] == "a"

	session.set_start("b")
	state = session.get_state()
	assert state["startNodeId"] == "b"
	assert state["currentNodeId"] == "b"
	assert state["nodeAttempts"] == {}

	state = session.step()
	assert "Failed at" not in state["message"]
	assert "a" not in state["nodeAttempts"]
	assert state["nodeAttempts"]["b"][-1]["status"] == "completed"
	assert state["nodeAttempts"]["b"][-1]["output"]["stage"] == "b"
	assert state["currentNodeId"] == "c"
	assert "Completed \"b\"" in state["message"]


def test_step_without_progress_ignores_stale_entry_cursor() -> None:
	"""Even if current still points at entry, idle Step honors start_node_id."""
	graph = _linear_graph()
	session = RuntimeSession(graph)
	session.session.start_node_id = "b"
	session.session.start_input = {"brief": {"prompt_text": "hi"}, "from": "manual"}
	# Simulate the old bug: start changed but cursor left on entry.
	session.session.current_node_id = "a"
	session._cursor_payload = None

	state = session.step()
	assert "a" not in state["nodeAttempts"]
	assert state["nodeAttempts"]["b"][-1]["status"] == "completed"
	assert state["nodeAttempts"]["b"][-1]["input"]["from"] == "manual"


def test_clear_start_resets_cursor_to_entry() -> None:
	graph = _linear_graph()
	session = RuntimeSession(graph)
	session.set_start("b")
	session.clear_start()
	state = session.get_state()
	assert state["startNodeId"] == "a"
	assert state["currentNodeId"] == "a"


def test_io_payload_uses_last_attempt() -> None:
	graph = _linear_graph()
	session = RuntimeSession(graph)
	session.step()
	assert session.io_payload("a", "in")["brief"]["prompt_text"] == "hi"
	assert session.io_payload("a", "out")["stage"] == "a"
	assert session.io_payload("c", "out") is None


def test_io_payload_falls_back_to_start_input_before_run() -> None:
	graph = _linear_graph()
	session = RuntimeSession(graph)
	session.set_start_input({"brief": {"prompt_text": "edited"}})
	assert session.io_payload("a", "in")["brief"]["prompt_text"] == "edited"


def test_io_payload_rejects_bad_side() -> None:
	graph = _linear_graph()
	session = RuntimeSession(graph)
	try:
		session.io_payload("a", "both")
	except ValueError as exc:
		assert "side" in str(exc)
	else:
		raise AssertionError("expected ValueError")
