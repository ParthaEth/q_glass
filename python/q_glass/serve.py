from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from q_glass.graph import Graph
from q_glass.runtime import RuntimeSession


def _cors(handler: BaseHTTPRequestHandler) -> None:
	handler.send_header("Access-Control-Allow-Origin", "*")
	handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	handler.send_header("Access-Control-Allow-Headers", "Content-Type")


def _read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
	length = int(handler.headers.get("Content-Length", "0") or "0")
	if length <= 0:
		return {}
	raw = handler.rfile.read(length)
	if not raw:
		return {}
	data = json.loads(raw.decode("utf-8"))
	if not isinstance(data, dict):
		raise ValueError("JSON body must be an object")
	return data


def _send_json(handler: BaseHTTPRequestHandler, code: int, payload: Any) -> None:
	body = json.dumps(payload).encode("utf-8")
	handler.send_response(code)
	_cors(handler)
	handler.send_header("Content-Type", "application/json")
	handler.send_header("Content-Length", str(len(body)))
	handler.end_headers()
	handler.wfile.write(body)


def serve(
	graph: Graph,
	*,
	host: str = "127.0.0.1",
	port: int = 8787,
	blocking: bool = True,
) -> ThreadingHTTPServer:
	"""Serve graph + session API for the React HttpAdapter."""
	runtime = RuntimeSession(graph)

	class Handler(BaseHTTPRequestHandler):
		def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A003
			return

		def do_OPTIONS(self) -> None:  # noqa: N802
			self.send_response(204)
			_cors(self)
			self.end_headers()

		def do_GET(self) -> None:  # noqa: N802
			path = urlparse(self.path).path
			try:
				if path in ("/api/graph", "/graph"):
					_send_json(self, 200, graph.to_ui_dict())
					return
				if path in ("/api/session", "/session"):
					_send_json(self, 200, runtime.get_state())
					return
				if path in ("/", "/health"):
					_send_json(self, 200, {"ok": True, "graphId": graph.id})
					return
				_send_json(self, 404, {"error": f"not found: {path}"})
			except Exception as exc:  # noqa: BLE001
				_send_json(self, 500, {"error": str(exc)})

		def do_POST(self) -> None:  # noqa: N802
			path = urlparse(self.path).path
			try:
				body = _read_json(self)
			except Exception as exc:  # noqa: BLE001
				_send_json(self, 400, {"error": str(exc)})
				return
			try:
				if path in ("/api/session/start", "/session/start"):
					inp = body.get("startInput", body.get("input"))
					if inp is not None and not isinstance(inp, dict):
						raise ValueError("startInput must be an object")
					state = runtime.start(inp if isinstance(inp, dict) else None)
					_send_json(self, 200, state)
					return
				if path in ("/api/session/step", "/session/step"):
					_send_json(self, 200, runtime.step())
					return
				if path in ("/api/session/set_start", "/session/set_start"):
					node_id = body.get("nodeId") or body.get("stageId")
					if not node_id:
						raise ValueError("nodeId required")
					runtime.set_start(str(node_id))
					_send_json(self, 200, runtime.get_state())
					return
				if path in ("/api/session/clear_start", "/session/clear_start"):
					runtime.clear_start()
					_send_json(self, 200, runtime.get_state())
					return
				if path in ("/api/session/set_stop", "/session/set_stop"):
					node_id = body.get("nodeId") or body.get("stageId")
					if not node_id:
						raise ValueError("nodeId required")
					runtime.set_stop(str(node_id))
					_send_json(self, 200, runtime.get_state())
					return
				if path in ("/api/session/clear_stop", "/session/clear_stop"):
					runtime.clear_stop()
					_send_json(self, 200, runtime.get_state())
					return
				if path in ("/api/session/set_start_input", "/session/set_start_input"):
					value = body.get("input", body.get("startInput", body))
					runtime.set_start_input(value)
					_send_json(self, 200, runtime.get_state())
					return
				_send_json(self, 404, {"error": f"not found: {path}"})
			except Exception as exc:  # noqa: BLE001
				_send_json(self, 500, {"error": str(exc)})

	httpd = ThreadingHTTPServer((host, port), Handler)
	if blocking:
		print(f"q_glass API listening on http://{host}:{port}")
		print(
			f"Open UI: http://127.0.0.1:5173/?adapter=http&api=http://{host}:{port}"
		)
		try:
			httpd.serve_forever()
		except KeyboardInterrupt:
			print("\nShutting down.")
			httpd.shutdown()
	else:
		thread = threading.Thread(target=httpd.serve_forever, daemon=True)
		thread.start()
	return httpd
