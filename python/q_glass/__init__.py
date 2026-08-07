"""q_glass — build graphs in Python; JSON is an internal detail."""

from __future__ import annotations

from q_glass.builder import GraphBuilder
from q_glass.graph import Graph
from q_glass.runtime import RunResult, Session, run_from, run_node
from q_glass.serve import serve

__all__ = [
	"Graph",
	"GraphBuilder",
	"RunResult",
	"Session",
	"run_from",
	"run_node",
	"serve",
]

__version__ = "0.2.0"
