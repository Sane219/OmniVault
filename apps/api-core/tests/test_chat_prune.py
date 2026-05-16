"""Tests for chat.py — _prune_graph and _build_prompt (pure logic, no I/O).

These functions live inside routes/chat.py which imports heavy deps (Supabase, Robyn).
We mock those deps before importing so we can test the pure logic in isolation.
"""
import json
import sys
import types
import pytest


# ── Mock heavy dependencies before importing chat ──────────────────────────────

# Mock robyn
robyn_mock = types.ModuleType("robyn")
robyn_mock.Response = type("Response", (), {})
robyn_mock.SSEResponse = type("SSEResponse", (), {"__init__": lambda s, g: None})
robyn_mock.SSEMessage = type("SSEMessage", (), {"__init__": lambda s, data=None, event=None: None})

class _FakeRouter:
    def __init__(self, *a, **k): pass
    def get(self, p): return lambda f: f
    def post(self, p): return lambda f: f
    def put(self, p): return lambda f: f
    def delete(self, p): return lambda f: f

robyn_mock.SubRouter = _FakeRouter
sys.modules["robyn"] = robyn_mock

# Mock api_core.db
db_mock = types.ModuleType("api_core.db")
db_mock.supabase = None
sys.modules["api_core.db"] = db_mock

# Mock api_core.auth_utils
auth_mock = types.ModuleType("api_core.auth_utils")
auth_mock.decode_token = lambda r: None
sys.modules["api_core.auth_utils"] = auth_mock

# Mock api_core.crypto_utils
crypto_mock = types.ModuleType("api_core.crypto_utils")
crypto_mock.decrypt_value = lambda v: v
crypto_mock.is_encrypted = lambda v: False
sys.modules["api_core.crypto_utils"] = crypto_mock

# Remove cached routes so they re-import with our mocks
for key in list(sys.modules.keys()):
    if key.startswith("api_core.routes"):
        del sys.modules[key]

from api_core.routes.chat import _prune_graph, _build_prompt


def make_graph(nodes, edges):
    return {"nodes": [{"id": str(i), "label": f"N{i}"} for i in nodes],
            "edges": [{"source": str(s), "target": str(t)} for s, t in edges]}


class TestPruneGraph:
    def test_non_dict_passthrough(self):
        assert _prune_graph([], None) == []

    def test_small_graph_no_context(self):
        graph = make_graph([1, 2, 3], [(1, 2), (2, 3)])
        result = _prune_graph(graph, None)
        assert result == graph

    def test_node_context_returns_ego_subgraph(self):
        graph = make_graph([1, 2, 3, 4, 5], [(1, 2), (2, 3), (3, 4), (4, 5)])
        result = _prune_graph(graph, {"id": "3", "label": "N3"})
        node_ids = {n["id"] for n in result["nodes"]}
        assert node_ids == {"2", "3", "4"}

    def test_node_context_edges_filtered(self):
        graph = make_graph([1, 2, 3, 4], [(1, 2), (2, 3), (3, 4)])
        result = _prune_graph(graph, {"id": "2"})
        edge_pairs = {(e["source"], e["target"]) for e in result["edges"]}
        assert edge_pairs == {("1", "2"), ("2", "3")}

    def test_large_graph_returns_roots_only(self):
        nodes = list(range(1002))
        edges = [(0, i) for i in range(1, 1002)]
        graph = make_graph(nodes, edges)
        result = _prune_graph(graph, None)
        root_ids = {n["id"] for n in result["nodes"]}
        assert root_ids == {"0"}

    def test_large_graph_with_context_returns_ego(self):
        nodes = list(range(1002))
        edges = [(i, i + 1) for i in range(1001)]
        graph = make_graph(nodes, edges)
        result = _prune_graph(graph, {"id": "500"})
        node_ids = {n["id"] for n in result["nodes"]}
        assert "499" in node_ids
        assert "500" in node_ids
        assert "501" in node_ids

    def test_node_context_nonexistent_node(self):
        """Selecting a node not in the graph returns empty (no matching nodes)."""
        graph = make_graph([1, 2, 3], [(1, 2)])
        result = _prune_graph(graph, {"id": "999"})
        node_ids = {n["id"] for n in result["nodes"]}
        assert node_ids == set()


class TestBuildPrompt:
    def test_contains_graph_json(self):
        graph = make_graph([1, 2], [(1, 2)])
        prompt = _build_prompt(graph, "hello", None)
        assert '"nodes"' in prompt
        assert '"edges"' in prompt

    def test_contains_user_message(self):
        graph = make_graph([1], [])
        prompt = _build_prompt(graph, "What is this document about?", None)
        assert "What is this document about?" in prompt

    def test_contains_node_context_when_provided(self):
        graph = make_graph([1, 2], [(1, 2)])
        ctx = {"id": "1", "label": "Chapter 1", "type": "section"}
        prompt = _build_prompt(graph, "summarize", ctx)
        assert "Chapter 1" in prompt
        assert "Node ID: 1" in prompt

    def test_no_node_context_section_when_none(self):
        graph = make_graph([1], [])
        prompt = _build_prompt(graph, "hi", None)
        assert "Node ID" not in prompt

    def test_pruning_applied(self):
        nodes = list(range(1002))
        edges = [(0, i) for i in range(1, 1002)]
        graph = make_graph(nodes, edges)
        prompt = _build_prompt(graph, "test", None)
        assert '"id":"0"' in prompt.replace(" ", "")
        assert '"id":"500"' not in prompt.replace(" ", "")
