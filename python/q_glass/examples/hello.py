from __future__ import annotations

from typing import Any


def build_hello_graph():
	"""Hello pipeline with real Python handlers (generic demo)."""
	from q_glass import GraphBuilder

	def accept(inp: dict[str, Any]) -> dict[str, Any]:
		query = str(inp.get("query", "")).strip()
		return {"job_id": "hello-1", "query": query}

	def fetch(inp: dict[str, Any]) -> dict[str, Any]:
		query = str(inp.get("query", ""))
		return {
			"job_id": inp.get("job_id", "hello-1"),
			"query": query,
			"items": [{"id": "doc-1", "type": "text", "snippet": query[:80]}],
		}

	def draft(inp: dict[str, Any]) -> dict[str, Any]:
		query = str(inp.get("query", ""))
		plan = ["collect", "analyze", "write"]
		if not query:
			plan = []
		return {
			"job_id": inp.get("job_id"),
			"query": query,
			"items": inp.get("items", []),
			"plan": plan,
		}

	def validate(inp: dict[str, Any]) -> dict[str, Any]:
		plan = inp.get("plan") or []
		issues: list[str] = []
		if not plan:
			issues.append("empty_plan")
		return {
			**inp,
			"ok": len(issues) == 0,
			"issues": issues,
		}

	def repair(inp: dict[str, Any]) -> dict[str, Any]:
		plan = list(inp.get("plan") or [])
		if not plan:
			plan = ["collect", "analyze", "write"]
		return {**inp, "plan": plan, "issues": [], "ok": True, "repaired": True}

	def export(inp: dict[str, Any]) -> dict[str, Any]:
		return {
			"artifact": "result.json",
			"job_id": inp.get("job_id"),
			"query": inp.get("query"),
			"plan": inp.get("plan"),
			"ok": bool(inp.get("ok", True)),
		}

	b = GraphBuilder(
		"q_glass.hello.v1",
		label="Hello pipeline (example)",
		description="Runnable demo with real Python handlers.",
	)
	b.activity(
		"accept_request",
		accept,
		label="Accept request",
		visual_type="stadium",
		sample_input={"query": "Summarize the weekly report"},
		position={"x": 220, "y": 0},
	)
	b.activity(
		"fetch_inputs",
		fetch,
		label="Fetch inputs",
		position={"x": 220, "y": 130},
	)
	b.activity(
		"draft_plan",
		draft,
		label="Draft plan",
		position={"x": 220, "y": 260},
	)
	b.activity(
		"validate_plan",
		validate,
		label="Validate plan",
		position={"x": 220, "y": 390},
	)
	b.decision(
		"has_issues",
		label="Validation issues?",
		position={"x": 246, "y": 530},
	)
	b.activity(
		"repair",
		repair,
		label="Repair plan",
		position={"x": 520, "y": 560},
	)
	b.activity(
		"export_result",
		export,
		label="Export result",
		visual_type="stadium",
		position={"x": 220, "y": 760},
	)
	b.edge("accept_request", "fetch_inputs")
	b.edge("fetch_inputs", "draft_plan")
	b.edge("draft_plan", "validate_plan")
	b.edge("validate_plan", "has_issues")
	b.edge("has_issues", "repair", label="Yes")
	b.edge("has_issues", "export_result", label="No")
	b.edge("repair", "validate_plan", label="loop", cycle=True)
	b.group(
		"planning",
		["draft_plan", "validate_plan"],
		label="Planning",
	)
	return b.build()


def main(argv: list[str] | None = None) -> None:
	import argparse
	import json

	from q_glass import run_from, serve

	parser = argparse.ArgumentParser(description="q_glass hello pipeline demo")
	parser.add_argument(
		"command",
		nargs="?",
		default="serve",
		choices=["serve", "run"],
		help="serve dashboard API (default) or run once on CLI",
	)
	parser.add_argument("--host", default="127.0.0.1")
	parser.add_argument("--port", type=int, default=8787)
	parser.add_argument(
		"--query",
		default="Summarize the weekly report",
		help="Start input query for run mode",
	)
	parser.add_argument("--stop-after", default=None)
	parser.add_argument(
		"--headless",
		action="store_true",
		help="API only — do not start the Vite UI (default starts npm run dev)",
	)
	parser.add_argument("--ui-host", default="127.0.0.1")
	parser.add_argument("--ui-port", type=int, default=5173)
	parser.add_argument(
		"--no-open",
		action="store_true",
		help="Do not open a browser tab automatically",
	)
	args = parser.parse_args(argv)

	graph = build_hello_graph()
	if args.command == "run":
		result = run_from(
			graph,
			start="accept_request",
			input={"query": args.query},
			stop_after=args.stop_after,
		)
		print(json.dumps({
			"path": result.path,
			"stopped_after": result.stopped_after,
			"final_output": result.final_output,
		}, indent=2))
		return

	serve(
		graph,
		host=args.host,
		port=args.port,
		blocking=True,
		headless=args.headless,
		ui_host=args.ui_host,
		ui_port=args.ui_port,
		open_browser=not args.no_open,
	)


if __name__ == "__main__":
	main()
