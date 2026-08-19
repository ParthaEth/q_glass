from __future__ import annotations

import threading
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any

from q_glass.graph import Graph, NodeSpec


@dataclass
class NodeAttempt:
	attempt: int
	status: str
	input: Any = None
	output: Any = None
	error: str | None = None


@dataclass
class RunResult:
	final_output: dict[str, Any] | None
	attempts: dict[str, list[NodeAttempt]]
	stopped_after: str | None = None
	path: list[str] = field(default_factory=list)


@dataclass
class Session:
	"""Dashboard session state (mirrors React controls)."""

	run_id: str = "session-1"
	start_node_id: str | None = None
	start_input: dict[str, Any] | None = None
	stop_after: str | None = None
	current_node_id: str | None = None
	node_attempts: dict[str, list[NodeAttempt]] = field(default_factory=dict)
	message: str = ""
	_payload: dict[str, Any] | None = None

	def to_ui_dict(self, graph: Graph) -> dict[str, Any]:
		start = self.start_node_id or graph.entry_node_id()
		attempts_out: dict[str, list[dict[str, Any]]] = {}
		for nid, attempts in self.node_attempts.items():
			attempts_out[nid] = [
				{
					"attempt": a.attempt,
					"status": a.status,
					"input": a.input,
					"output": a.output,
					**({"error": a.error} if a.error else {}),
				}
				for a in attempts
			]
		return {
			"runId": self.run_id,
			"graphId": graph.id,
			"currentNodeId": self.current_node_id,
			"startNodeId": start,
			"startInput": self.start_input
			if self.start_input is not None
			else _default_sample(graph, start),
			"stopAfter": self.stop_after,
			"nodeAttempts": attempts_out,
			"message": self.message,
		}


def _default_sample(graph: Graph, node_id: str) -> dict[str, Any]:
	node = graph.nodes.get(node_id)
	if node and node.sample_input is not None:
		return deepcopy(node.sample_input)
	return {}


def _decision_want_yes(payload: dict[str, Any] | None) -> bool:
	"""Resolve Yes/No for decision diamonds.

	Precedence:
	1. Explicit ``decision_yes`` boolean (preferred for multi-decision graphs).
	2. Legacy: non-empty ``issues`` list → Yes (hello-pipeline repair branch).
	"""
	if not isinstance(payload, dict):
		return False
	if "decision_yes" in payload:
		return bool(payload.get("decision_yes"))
	issues = payload.get("issues") or []
	return bool(issues)


def _next_node_id(graph: Graph, from_id: str, payload: dict[str, Any] | None) -> str | None:
	all_outs = [e for e in graph.edges if e.source == from_id]
	# Prefer forward edges, but decisions must also see cycle-labeled Yes/No
	# branches (e.g. more_spans? Yes → choose_resource).
	outs = [e for e in all_outs if not e.cycle] or all_outs
	if not outs:
		return None
	node = graph.nodes[from_id]
	if node.kind == "decision":
		outs = all_outs
		want_yes = _decision_want_yes(payload)
		for e in outs:
			label = (e.label or "").lower()
			if want_yes and label in ("yes", "true"):
				return e.target
			if not want_yes and label in ("no", "false"):
				return e.target
		no = next((e for e in outs if (e.label or "").lower() in ("no", "false")), None)
		yes = next((e for e in outs if (e.label or "").lower() in ("yes", "true")), None)
		if want_yes and yes:
			return yes.target
		if no:
			return no.target
	return outs[0].target


def run_node(graph: Graph, node_id: str, input_data: dict[str, Any] | None = None) -> dict[str, Any]:
	"""Execute a single node handler (decisions pass input through)."""
	if node_id not in graph.nodes:
		raise KeyError(f"Unknown node {node_id!r}")
	node = graph.nodes[node_id]
	payload = deepcopy(input_data) if input_data is not None else {}
	if node.kind == "decision":
		return payload
	if node.handler is None:
		raise ValueError(f"Node {node_id!r} has no handler")
	out = node.handler(payload)
	if not isinstance(out, dict):
		raise TypeError(f"Handler {node_id!r} must return dict, got {type(out)}")
	return out


def run_from(
	graph: Graph,
	*,
	start: str | None = None,
	input: dict[str, Any] | None = None,
	stop_after: str | None = None,
) -> RunResult:
	"""Walk the happy path from start, invoking real handlers."""
	start_id = start or graph.entry_node_id()
	if start_id not in graph.nodes:
		raise KeyError(f"Unknown start node {start_id!r}")

	payload = deepcopy(input) if input is not None else _default_sample(graph, start_id)
	attempts: dict[str, list[NodeAttempt]] = {}
	path: list[str] = []
	current: str | None = start_id
	final: dict[str, Any] | None = None
	stopped: str | None = None
	guard = 0
	# Loops (BG segment placement, repair) reuse nodes; allow many iterations.
	max_steps = max(len(graph.nodes) * 12, 64)

	while current and guard < max_steps:
		guard += 1
		path.append(current)
		node = graph.nodes[current]
		try:
			out = run_node(graph, current, payload)
		except Exception as exc:  # noqa: BLE001 — record and stop
			n = len(attempts.get(current, [])) + 1
			attempts.setdefault(current, []).append(
				NodeAttempt(attempt=n, status="failed", input=payload, error=str(exc))
			)
			raise

		n = len(attempts.get(current, [])) + 1
		attempts.setdefault(current, []).append(
			NodeAttempt(attempt=n, status="completed", input=deepcopy(payload), output=deepcopy(out))
		)
		payload = out
		final = out

		if stop_after and current == stop_after:
			stopped = current
			break

		current = _next_node_id(graph, current, payload)

	return RunResult(final_output=final, attempts=attempts, stopped_after=stopped, path=path)


class RuntimeSession:
	"""Mutable session used by the HTTP dashboard."""

	def __init__(self, graph: Graph) -> None:
		self.graph = graph
		self._lock = threading.Lock()
		self.session = Session(
			start_node_id=graph.entry_node_id(),
			start_input=_default_sample(graph, graph.entry_node_id()),
			current_node_id=graph.entry_node_id(),
			message=f'Ready at start "{graph.entry_node_id()}". Edit input, then Start.',
		)
		self._cursor_payload: dict[str, Any] | None = None

	def get_state(self) -> dict[str, Any]:
		return self.session.to_ui_dict(self.graph)

	def io_payload(self, node_id: str, side: str) -> Any:
		"""Last recorded I/O for ``node_id``, else start/sample payload.

		The dashboard calls this from ``POST /api/visualize`` so the browser
		does not have to round-trip huge stage payloads on every node click.
		"""
		if side not in ("in", "out"):
			raise ValueError("side must be 'in' or 'out'")
		attempts = self.session.node_attempts.get(node_id, [])
		if attempts:
			last = attempts[-1]
			return last.input if side == "in" else last.output
		start_id = self.session.start_node_id or self.graph.entry_node_id()
		if side == "in" and node_id == start_id:
			return self.session.start_input
		node = self.graph.nodes.get(node_id)
		if node is None:
			return None
		return node.sample_input if side == "in" else node.sample_output

	def set_start(self, node_id: str) -> None:
		if node_id not in self.graph.nodes:
			self.session.message = f'Unknown start stage "{node_id}"'
			return
		same = self.session.start_node_id == node_id
		self.session.start_node_id = node_id
		if not same:
			self.session.start_input = _default_sample(self.graph, node_id)
			# Only wipe attempts when the start node changes — keeps the graph
			# fully drawn when the user just clicks Start again on the same node.
			self.session.node_attempts = {}
			self._cursor_payload = None
		# Park the execution cursor at start so Step does not keep walking from
		# the graph entry (or a previous mid-run node).
		self.session.current_node_id = node_id
		self.session.message = (
			f'Start set at "{node_id}". Edit input, then Start or Step next.'
		)

	def clear_start(self) -> None:
		entry = self.graph.entry_node_id()
		prev = self.session.start_node_id
		self.session.start_node_id = entry
		self.session.start_input = _default_sample(self.graph, entry)
		self.session.current_node_id = entry
		if prev != entry:
			# Only wipe attempts when the start node actually changes.
			self.session.node_attempts = {}
			self._cursor_payload = None
		self.session.message = f'Start cleared → entry "{entry}".'

	def set_stop(self, node_id: str) -> None:
		if node_id not in self.graph.nodes:
			self.session.message = f'Unknown stop stage "{node_id}"'
			return
		self.session.stop_after = node_id
		self.session.message = f'Stop set at "{node_id}". Click Start to run until that stage.'

	def clear_stop(self) -> None:
		self.session.stop_after = None
		self.session.message = "Stop cleared."

	def set_start_input(self, value: Any) -> None:
		if not isinstance(value, dict):
			self.session.message = "Start input must be a JSON object"
			return
		self.session.start_input = deepcopy(value)
		sid = self.session.start_node_id or self.graph.entry_node_id()
		# Keep existing node_attempts visible (greyed-out stale state) so the
		# graph stays fully drawn while the user edits input. They are cleared
		# when start() or step() actually begins the new run.
		self.session.message = f'Start input updated for "{sid}". Click Start to run.'

	def start(self, start_input: dict[str, Any] | None = None) -> dict[str, Any]:
		start_id = self.session.start_node_id or self.graph.entry_node_id()
		inp = (
			deepcopy(start_input)
			if start_input is not None
			else deepcopy(self.session.start_input or _default_sample(self.graph, start_id))
		)
		self.session.start_input = inp
		stop = self.session.stop_after
		result = run_from(self.graph, start=start_id, input=inp, stop_after=stop)
		self.session.node_attempts = result.attempts
		if result.stopped_after:
			self.session.current_node_id = result.stopped_after
			self.session.message = (
				f'Ran from "{start_id}" until stop at "{result.stopped_after}".'
			)
			self._cursor_payload = deepcopy(result.final_output)
		elif result.path:
			self.session.current_node_id = None
			self.session.message = f'Finished from start "{start_id}".'
			self._cursor_payload = deepcopy(result.final_output)
		else:
			self.session.current_node_id = start_id
			self.session.message = "Nothing to run."
		return self.get_state()

	def step(self) -> dict[str, Any]:
		"""Advance one node from current (or start if idle)."""
		with self._lock:
			return self._step_locked()

	def _has_completed_progress(self) -> bool:
		return any(
			a.status == "completed"
			for attempts in self.session.node_attempts.values()
			for a in attempts
		)

	def _step_locked(self) -> dict[str, Any]:
		"""Advance one node from current (or start if idle)."""
		graph = self.graph
		sess = self.session
		start_id = sess.start_node_id or graph.entry_node_id()

		# Resume past stop
		cur = sess.current_node_id
		if (
			cur
			and sess.stop_after == cur
			and any(a.status == "completed" for a in sess.node_attempts.get(cur, []))
		):
			nxt = _next_node_id(graph, cur, self._cursor_payload)
			sess.stop_after = None
			sess.current_node_id = nxt
			sess.message = (
				f'Resumed past stop → now at "{nxt}"' if nxt else "Resumed past stop. Finished."
			)
			return self.get_state()

		# Idle / no successful progress → always begin at the configured start
		# (not the graph entry), even if current_node_id still points at entry.
		if cur is None or not self._has_completed_progress():
			cur = start_id
			self._cursor_payload = deepcopy(
				sess.start_input or _default_sample(graph, cur)
			)
			sess.current_node_id = cur
			# Keep all previous attempts visible (stale) so the whole graph
			# stays drawn. Each node's attempts are replaced when it re-runs.
			# Only drop the start node's prior attempts so it shows as "next"
			# rather than "completed" at the beginning of a fresh run.
			if not sess.node_attempts.get(cur):
				sess.node_attempts.pop(cur, None)

		assert cur is not None
		payload = deepcopy(self._cursor_payload or {})
		if cur == start_id and not any(
			a.status == "completed" for a in sess.node_attempts.get(cur, [])
		):
			payload = deepcopy(sess.start_input or _default_sample(graph, cur))

		try:
			out = run_node(graph, cur, payload)
		except Exception as exc:  # noqa: BLE001 — record failure; stay on node
			n = len(sess.node_attempts.get(cur, [])) + 1
			sess.node_attempts.setdefault(cur, []).append(
				NodeAttempt(
					attempt=n,
					status="failed",
					input=deepcopy(payload),
					error=str(exc),
				)
			)
			sess.message = f'Failed at "{cur}": {exc}'
			return self.get_state()

		n = len(sess.node_attempts.get(cur, [])) + 1
		sess.node_attempts.setdefault(cur, []).append(
			NodeAttempt(attempt=n, status="completed", input=deepcopy(payload), output=deepcopy(out))
		)
		self._cursor_payload = out

		if sess.stop_after == cur:
			sess.message = f'Stopped after "{cur}". Step next to resume, or Clear stop.'
			return self.get_state()

		nxt = _next_node_id(graph, cur, out)
		sess.current_node_id = nxt
		sess.message = (
			f'Completed "{cur}" → now at "{nxt}"' if nxt else f'Completed "{cur}". Finished.'
		)
		return self.get_state()
