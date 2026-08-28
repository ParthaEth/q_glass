"""Tests for the local-media bridge used by host video visualizers."""

from __future__ import annotations

from pathlib import Path

from q_glass.serve import _MediaStore, _prepare_media_views, _send_media


class _DisconnectingBuffer:
	def write(self, _chunk: bytes) -> int:
		raise BrokenPipeError("browser closed the media request")


class _DisconnectingHandler:
	def __init__(self) -> None:
		self.headers: dict[str, str] = {}
		self.wfile = _DisconnectingBuffer()

	def send_response(self, _status: int) -> None:
		return

	def send_header(self, _name: str, _value: str) -> None:
		return

	def end_headers(self) -> None:
		return


class _HeaderRecordingHandler:
	def __init__(self) -> None:
		self.headers: dict[str, str] = {}
		self.sent_headers: dict[str, str] = {}
		self.wfile = _DisconnectingBuffer()

	def send_response(self, _status: int) -> None:
		return

	def send_header(self, name: str, value: str) -> None:
		self.sent_headers[name] = value

	def end_headers(self) -> None:
		return


class TestMediaStore:
	def test_local_video_source_becomes_opaque_media_url(self, tmp_path: Path) -> None:
		mp4 = tmp_path / "preview.mp4"
		mp4.write_bytes(b"video")
		store = _MediaStore()
		prepared = _prepare_media_views(
			[
				{
					"id": "host.preview",
					"title": "Preview",
					"view": {"kind": "video", "source": str(mp4)},
				}
			],
			store,
		)
		source = prepared[0]["view"]["source"]
		assert source.startswith("/api/media/")
		assert str(mp4) not in source
		assert store.resolve(source.removeprefix("/api/media/")) == mp4

	def test_local_image_source_becomes_opaque_media_url(self, tmp_path: Path) -> None:
		png = tmp_path / "camera-seed.png"
		png.write_bytes(b"image")
		store = _MediaStore()
		prepared = _prepare_media_views(
			[
				{
					"id": "host.cameraSeed",
					"title": "Camera seed",
					"view": {"kind": "image", "source": str(png)},
				}
			],
			store,
		)
		source = prepared[0]["view"]["source"]
		assert source.startswith("/api/media/")
		assert str(png) not in source
		assert store.resolve(source.removeprefix("/api/media/")) == png

	def test_missing_local_video_is_not_sent_to_the_browser(self, tmp_path: Path) -> None:
		prepared = _prepare_media_views(
			[{"view": {"kind": "video", "source": str(tmp_path / "missing.mp4")}}],
			_MediaStore(),
		)
		assert prepared == []

	def test_remote_video_source_is_preserved(self) -> None:
		prepared = _prepare_media_views(
			[{"view": {"kind": "video", "source": "https://example.test/preview.mp4"}}],
			_MediaStore(),
		)
		assert prepared[0]["view"]["source"] == "https://example.test/preview.mp4"

	def test_browser_disconnect_while_streaming_media_is_silent(self, tmp_path: Path) -> None:
		mp4 = tmp_path / "preview.mp4"
		mp4.write_bytes(b"video")
		_send_media(_DisconnectingHandler(), mp4)

	def test_local_media_disables_browser_caching(self, tmp_path: Path) -> None:
		mp4 = tmp_path / "preview.mp4"
		mp4.write_bytes(b"video")
		handler = _HeaderRecordingHandler()
		_send_media(handler, mp4, head_only=True)
		assert handler.sent_headers["Cache-Control"] == "no-store"
