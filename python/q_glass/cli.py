from __future__ import annotations

import argparse
import sys


def main(argv: list[str] | None = None) -> None:
	argv = list(sys.argv[1:] if argv is None else argv)
	if not argv or argv[0] in ("-h", "--help"):
		print("Usage: python -m q_glass hello [serve|run] [options]")
		print("       q-glass hello serve --port 8787")
		print("       q-glass hello run --query '…'")
		if argv and argv[0] in ("-h", "--help"):
			return
		argv = ["hello", "serve"]

	if argv[0] != "hello":
		# treat first token as hello subcommand for convenience
		argv = ["hello", *argv]

	parser = argparse.ArgumentParser(prog="q-glass hello")
	parser.add_argument("command", nargs="?", default="serve", choices=["serve", "run"])
	parser.add_argument("--host", default="127.0.0.1")
	parser.add_argument("--port", type=int, default=8787)
	parser.add_argument("--query", default="Summarize the weekly report")
	parser.add_argument("--stop-after", default=None)
	parser.add_argument("--headless", action="store_true")
	parser.add_argument("--ui-host", default="127.0.0.1")
	parser.add_argument("--ui-port", type=int, default=5173)
	parser.add_argument("--no-open", action="store_true")
	args = parser.parse_args(argv[1:])

	from q_glass.examples.hello import main as hello_main

	hello_argv = [
		args.command,
		"--host",
		args.host,
		"--port",
		str(args.port),
		"--query",
		args.query,
		"--ui-host",
		args.ui_host,
		"--ui-port",
		str(args.ui_port),
	]
	if args.stop_after:
		hello_argv.extend(["--stop-after", args.stop_after])
	if args.headless:
		hello_argv.append("--headless")
	if args.no_open:
		hello_argv.append("--no-open")
	hello_main(hello_argv)


if __name__ == "__main__":
	main()
