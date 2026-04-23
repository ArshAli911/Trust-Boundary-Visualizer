from app.analysis import analyze_architecture
from app.models import ArchitectureDocument


def test_data_exposure_outward_flow():
    """Edge from restricted -> external with data classification produces a data-exposure finding."""
    arch = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "db", "type": "database", "trust_level": "restricted"},
                {"id": "ext", "type": "web_app", "trust_level": "external"},
            ],
            "edges": [
                {"from": "db", "to": "ext", "data_classification": "pii"},
            ],
        }
    )
    result = analyze_architecture(arch)
    assert result.summary.data_exposure_findings >= 1
    sources = [f.source for f in result.data_exposure_findings]
    assert "db" in sources


def test_data_exposure_privileged_to_external_no_classification():
    """Privileged -> external without classification should also trigger."""
    arch = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "svc", "type": "microservice", "trust_level": "privileged"},
                {"id": "cdn", "type": "cdn", "trust_level": "external"},
            ],
            "edges": [
                {"from": "svc", "to": "cdn"},
            ],
        }
    )
    result = analyze_architecture(arch)
    assert result.summary.data_exposure_findings >= 1


def test_insecure_channel_crossing():
    """Edge crossing trust boundary with no protocol produces a misconfiguration."""
    arch = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "gw", "type": "api_gateway", "trust_level": "external"},
                {"id": "app", "type": "microservice", "trust_level": "internal"},
            ],
            "edges": [
                {"from": "gw", "to": "app"},  # no protocol
            ],
        }
    )
    result = analyze_architecture(arch)
    patterns = [f.pattern for f in result.misconfiguration_findings]
    assert "insecure_channel" in patterns


def test_secure_channel_not_flagged():
    """Edge crossing trust boundary with https should NOT produce insecure_channel."""
    arch = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "gw", "type": "api_gateway", "trust_level": "external"},
                {"id": "app", "type": "microservice", "trust_level": "internal"},
            ],
            "edges": [
                {"from": "gw", "to": "app", "protocol": "https"},
            ],
        }
    )
    result = analyze_architecture(arch)
    insecure = [f for f in result.misconfiguration_findings if f.pattern == "insecure_channel"]
    assert len(insecure) == 0


def test_lateral_movement_detected():
    """3+ same-trust nodes in a chain produce a lateral-movement finding."""
    arch = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "svc-a", "type": "microservice", "trust_level": "internal"},
                {"id": "svc-b", "type": "microservice", "trust_level": "internal"},
                {"id": "svc-c", "type": "microservice", "trust_level": "internal"},
            ],
            "edges": [
                {"from": "svc-a", "to": "svc-b", "protocol": "grpc"},
                {"from": "svc-b", "to": "svc-c", "protocol": "grpc"},
            ],
        }
    )
    result = analyze_architecture(arch)
    assert result.summary.lateral_movement_findings >= 1
    paths = [f.path for f in result.lateral_movement_findings]
    assert any(len(p) >= 3 for p in paths)


def test_single_point_of_failure():
    """Star-topology center node flagged as chokepoint."""
    arch = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "a", "type": "web_app", "trust_level": "external"},
                {"id": "hub", "type": "api_gateway", "trust_level": "internal"},
                {"id": "b", "type": "database", "trust_level": "restricted"},
                {"id": "c", "type": "microservice", "trust_level": "privileged"},
            ],
            "edges": [
                {"from": "a", "to": "hub", "protocol": "https"},
                {"from": "hub", "to": "b", "protocol": "https"},
                {"from": "hub", "to": "c", "protocol": "https"},
            ],
        }
    )
    result = analyze_architecture(arch)
    spof_nodes = [f.node for f in result.misconfiguration_findings if f.pattern == "single_point_of_failure"]
    assert "hub" in spof_nodes


def test_missing_auth_at_entry():
    """Public endpoint without auth produces a misconfiguration."""
    arch = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {
                    "id": "gw",
                    "type": "api_gateway",
                    "trust_level": "external",
                    "exposes_public_endpoint": True,
                },
                {"id": "app", "type": "microservice", "trust_level": "internal"},
            ],
            "edges": [
                {"from": "gw", "to": "app", "protocol": "https"},
            ],
        }
    )
    result = analyze_architecture(arch)
    patterns = [f.pattern for f in result.misconfiguration_findings]
    assert "missing_auth_at_entry" in patterns


def test_direct_data_access():
    """External node -> database edge produces a finding."""
    arch = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "ext", "type": "web_app", "trust_level": "external"},
                {"id": "db", "type": "database", "trust_level": "restricted"},
            ],
            "edges": [
                {"from": "ext", "to": "db"},
            ],
        }
    )
    result = analyze_architecture(arch)
    patterns = [f.pattern for f in result.misconfiguration_findings]
    assert "direct_data_access" in patterns
    direct = [f for f in result.misconfiguration_findings if f.pattern == "direct_data_access"]
    assert direct[0].severity == "critical"


def test_orphan_node():
    """Isolated node produces a finding."""
    arch = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "gw", "type": "api_gateway", "trust_level": "external"},
                {"id": "app", "type": "microservice", "trust_level": "internal"},
                {"id": "lonely", "type": "cache", "trust_level": "internal"},
            ],
            "edges": [
                {"from": "gw", "to": "app", "protocol": "https"},
            ],
        }
    )
    result = analyze_architecture(arch)
    orphans = [f for f in result.misconfiguration_findings if f.pattern == "orphan_node"]
    assert len(orphans) == 1
    assert orphans[0].node == "lonely"


def test_clean_graph_no_new_findings():
    """Well-secured same-level graph produces zero new findings."""
    arch = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "a", "type": "microservice", "trust_level": "internal", "auth": "jwt"},
                {"id": "b", "type": "microservice", "trust_level": "internal", "auth": "jwt"},
            ],
            "edges": [
                {"from": "a", "to": "b", "protocol": "grpc"},
            ],
        }
    )
    result = analyze_architecture(arch)
    assert result.summary.data_exposure_findings == 0
    assert result.summary.lateral_movement_findings == 0
    assert result.summary.misconfiguration_findings == 0
