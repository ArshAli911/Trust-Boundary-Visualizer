import pytest

from app.parser import parse_architecture


def test_parse_architecture_auto_detects_json_document():
    architecture = parse_architecture(
        """
        {
          "nodes": [
            {"id": "gateway", "type": "api_gateway", "trust_level": "external"},
            {"id": "db", "type": "database", "trust_level": "restricted"}
          ],
          "edges": [
            {"from": "gateway", "to": "db", "protocol": "https"}
          ]
        }
        """,
        "auto",
    )

    assert architecture.nodes[0].id == "gateway"
    assert architecture.edges[0].source == "gateway"
    assert architecture.edges[0].target == "db"


def test_parse_architecture_rejects_empty_document():
    with pytest.raises(ValueError, match="Architecture document is empty."):
        parse_architecture("", "auto")


def test_parse_architecture_rejects_non_object_payload():
    with pytest.raises(ValueError, match="Architecture document must describe an object."):
        parse_architecture("- just\n- a\n- list\n", "yaml")


def test_parse_architecture_rejects_malformed_document():
    with pytest.raises(ValueError, match="Unable to parse architecture document"):
        parse_architecture('{"nodes": [}', "json")
