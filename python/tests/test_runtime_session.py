"""RuntimeSession step error handling."""

from __future__ import annotations

from q_glass import GraphBuilder
from q_glass.runtime import RuntimeSession


def _boom(_inp: dict) -> dict:
	raise RuntimeError("OPENAI_API_KEY is not configured")


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
