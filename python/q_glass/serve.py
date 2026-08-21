from __future__ import annotations

import atexit
import json
import mimetypes
import os
import secrets
import shutil
import signal
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from q_glass.graph import Graph
from q_glass.runtime import RuntimeSession
from q_glass.visualizers import render_all


def find_ui_root() -> Path | None:
	"""Locate the q_glass frontend root (directory with package.json + src/App.tsx)."""
	here = Path(__file__).resolve()
	candidates = [here.parents[2], here.parents[1], Path.cwd()]
	seen: set[Path] = set()
	for start in candidates:
		for p in [start, *start.parents]:
			if p in seen:
				continue
			seen.add(p)
			if (p / "package.json").is_file() and (p / "src" / "App.tsx").is_file():
				return p
	return None


def dashboard_url(
	*,
	api_host: str = "127.0.0.1",
	api_port: int = 8787,
	ui_host: str = "127.0.0.1",
	ui_port: int = 5173,
) -> str:
	"""URL that selects HttpAdapter (bare Vite :5173 is simulated-only)."""
	return f"http://{ui_host}:{ui_port}/?adapter=http&api=http://{api_host}:{api_port}"


def _print_dashboard_banner(url: str, *, api_host: str, api_port: int) -> None:
	bar = "=" * 64
	print(bar)
	print("  q_glass dashboard  (real Python handlers via HttpAdapter)")
	print()
	print("  Open this URL in your browser:")
	print(f"    {url}")
	print()
	print("  Do not use Vite's bare http://127.0.0.1:5173/ link —")
	print("  that loads the simulated fixture, not your Python graph.")
	print(f"  API: http://{api_host}:{api_port}")
	print(bar)


def _start_vite(
	*,
	api_host: str,
	api_port: int,
	ui_host: str = "127.0.0.1",
	ui_port: int = 5173,
) -> subprocess.Popen[Any] | None:
	"""Spawn `npm run dev` (stdout/stderr silenced). Returns None if skipped."""
	ui_root = find_ui_root()
	if ui_root is None:
		print("q_glass: UI root not found (no package.json); API-only mode.")
		return None
	npm = shutil.which("npm")
	if not npm:
		print("q_glass: npm not found on PATH; API-only mode.")
		return None
	if not (ui_root / "node_modules").is_dir():
		print(f"q_glass: run `npm install` in {ui_root} first; API-only mode.")
		return None

	# Hide Vite's "Local: http://…:5173/" so users don't open simulated mode.
	proc = subprocess.Popen(
		[npm, "run", "dev", "--", "--host", ui_host, "--port", str(ui_port)],
		cwd=str(ui_root),
		stdout=subprocess.DEVNULL,
		stderr=subprocess.DEVNULL,
		start_new_session=True,
	)

	def _stop() -> None:
		if proc.poll() is not None:
			return
		try:
			os.killpg(proc.pid, signal.SIGTERM)
		except (ProcessLookupError, PermissionError):
			proc.terminate()
		try:
			proc.wait(timeout=5)
		except subprocess.TimeoutExpired:
			try:
				os.killpg(proc.pid, signal.SIGKILL)
			except (ProcessLookupError, PermissionError):
				proc.kill()

	atexit.register(_stop)
	return proc


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


class _MediaStore:
	"""Expose visualizer-selected local media through opaque, in-memory tokens."""

	def __init__(self) -> None:
		self._paths_by_token: dict[str, Path] = {}
		self._tokens_by_path: dict[Path, str] = {}

	def register(self, source: str) -> str | None:
		"""Return a q-glass media URL for an existing local file, if safe to serve."""
		parsed = urlparse(source)
		if parsed.scheme in {"http", "https", "data", "blob"}:
			return source
		if parsed.scheme == "file":
			candidate = Path(unquote(parsed.path))
		elif not parsed.scheme:
			candidate = Path(source)
		else:
			return None
		try:
			path = candidate.resolve(strict=True)
		except OSError:
			return None
		if not path.is_file():
			return None
		token = self._tokens_by_path.get(path)
		if token is None:
			token = secrets.token_urlsafe(18)
			self._tokens_by_path[path] = token
			self._paths_by_token[token] = path
		return f"/api/media/{token}"

	def resolve(self, token: str) -> Path | None:
		"""Return the still-existing file selected by a prior visualizer response."""
		path = self._paths_by_token.get(token)
		return path if path is not None and path.is_file() else None


def _prepare_media_views(
	visualizers: list[dict[str, Any]],
	media_store: _MediaStore,
) -> list[dict[str, Any]]:
	"""Replace local ``VideoView`` sources with q-glass media endpoint URLs."""
	prepared: list[dict[str, Any]] = []
	for item in visualizers:
		entry = dict(item)
		view_raw = entry.get("view")
		if not isinstance(view_raw, dict) or view_raw.get("kind") != "video":
			prepared.append(entry)
			continue
		view = dict(view_raw)
		source = view.get("source")
		if not isinstance(source, str) or not source.strip():
			continue
		served_source = media_store.register(source)
		if served_source is None:
			continue
		view["source"] = served_source
		entry["view"] = view
		prepared.append(entry)
	return prepared


def _send_media(
	handler: BaseHTTPRequestHandler,
	path: Path,
	*,
	head_only: bool = False,
) -> None:
	"""Stream an MP4/media file with single-range support for browser seeking."""
	size = path.stat().st_size
	content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
	start = 0
	end = max(size - 1, 0)
	status = 200
	range_header = handler.headers.get("Range")
	if range_header:
		try:
			unit, raw_range = range_header.split("=", 1)
			start_raw, end_raw = raw_range.split(",", 1)[0].strip().split("-", 1)
			if unit.strip() != "bytes":
				raise ValueError("unsupported range unit")
			if not start_raw:
				length = int(end_raw)
				if length <= 0:
					raise ValueError("invalid suffix range")
				start = max(size - length, 0)
			else:
				start = int(start_raw)
				end = int(end_raw) if end_raw else end
			if start < 0 or start >= size or end < start:
				raise ValueError("range outside media")
			end = min(end, size - 1)
			status = 206
		except (TypeError, ValueError):
			handler.send_response(416)
			_cors(handler)
			handler.send_header("Content-Range", f"bytes */{size}")
			handler.end_headers()
			return
	length = end - start + 1 if size else 0
	handler.send_response(status)
	_cors(handler)
	handler.send_header("Content-Type", content_type)
	handler.send_header("Accept-Ranges", "bytes")
	handler.send_header("Content-Length", str(length))
	if status == 206:
		handler.send_header("Content-Range", f"bytes {start}-{end}/{size}")
	handler.end_headers()
	if head_only or not length:
		return
	with path.open("rb") as media:
		media.seek(start)
		remaining = length
		while remaining:
			chunk = media.read(min(64 * 1024, remaining))
			if not chunk:
				break
			handler.wfile.write(chunk)
			remaining -= len(chunk)


def serve(
	graph: Graph,
	*,
	host: str = "127.0.0.1",
	port: int = 8787,
	blocking: bool = True,
	headless: bool = False,
	ui_host: str = "127.0.0.1",
	ui_port: int = 5173,
	open_browser: bool = True,
) -> ThreadingHTTPServer:
	"""Serve graph + session API for the React HttpAdapter.

	Unless ``headless`` is True (and ``blocking`` is True), also starts the Vite
	dev server so the dashboard can talk to this API. Vite's console is silenced;
	use the printed ``?adapter=http`` URL (not the bare :5173 link).
	"""
	runtime = RuntimeSession(graph)
	media_store = _MediaStore()
	ui_proc: subprocess.Popen[Any] | None = None
	url = dashboard_url(
		api_host=host, api_port=port, ui_host=ui_host, ui_port=ui_port
	)
	if blocking and not headless:
		ui_proc = _start_vite(
			api_host=host, api_port=port, ui_host=ui_host, ui_port=ui_port
		)

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
				if path.startswith("/api/media/"):
					token = path.removeprefix("/api/media/")
					media_path = media_store.resolve(token)
					if media_path is None:
						_send_json(self, 404, {"error": "media not found"})
						return
					_send_media(self, media_path)
					return
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

		def do_HEAD(self) -> None:  # noqa: N802
			path = urlparse(self.path).path
			if not path.startswith("/api/media/"):
				_send_json(self, 404, {"error": f"not found: {path}"})
				return
			token = path.removeprefix("/api/media/")
			media_path = media_store.resolve(token)
			if media_path is None:
				_send_json(self, 404, {"error": "media not found"})
				return
			try:
				_send_media(self, media_path, head_only=True)
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
				if path in ("/api/visualize", "/visualize"):
					stage_id = body.get("stageId") or body.get("nodeId")
					if not stage_id:
						raise ValueError("stageId or nodeId required")
					side = body.get("side", "out")
					if side not in ("in", "out"):
						raise ValueError("side must be 'in' or 'out'")
					node_id = str(body.get("nodeId") or stage_id)
					value = (
						body["value"]
						if "value" in body
						else runtime.io_payload(node_id, side)
					)
					visualizers = render_all(
						str(stage_id),
						side,  # type: ignore[arg-type]
						value,
					)
					visualizers = _prepare_media_views(visualizers, media_store)
					_send_json(self, 200, {"visualizers": visualizers})
					return
				_send_json(self, 404, {"error": f"not found: {path}"})
			except Exception as exc:  # noqa: BLE001
				_send_json(self, 500, {"error": str(exc)})

	httpd = ThreadingHTTPServer((host, port), Handler)
	if blocking:
		_print_dashboard_banner(url, api_host=host, api_port=port)
		if headless:
			print("(headless — Vite not started; omit --headless for full demo)")
		elif open_browser:
			import time
			import webbrowser

			# Brief pause so Vite can bind before the tab loads.
			time.sleep(0.6)
			try:
				webbrowser.open(url)
			except Exception:  # noqa: BLE001
				pass
		try:
			httpd.serve_forever()
		except KeyboardInterrupt:
			print("\nShutting down.")
		finally:
			httpd.shutdown()
			if ui_proc is not None and ui_proc.poll() is None:
				try:
					os.killpg(ui_proc.pid, signal.SIGTERM)
				except (ProcessLookupError, PermissionError):
					ui_proc.terminate()
	else:
		thread = threading.Thread(target=httpd.serve_forever, daemon=True)
		thread.start()
	return httpd
