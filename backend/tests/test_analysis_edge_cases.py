from app.analysis import analyze_architecture
from app.models import ArchitectureDocument


def test_public_endpoint_to_control_plane_creates_escalation_signal():
    architecture = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {
                    "id": "frontend",
                    "type": "web_app",
                    "trust_level": "internal",
                    "exposes_public_endpoint": True,
                },
                {
                    "id": "orchestrator",
                    "type": "orchestrator",
                    "trust_level": "privileged",
                    "auth": "mtls",
                },
            ],
            "edges": [
                {"from": "frontend", "to": "orchestrator", "protocol": "https"},
            ],
        }
    )

    result = analyze_architecture(architecture)

    assert result.summary.attack_paths == 1
    assert result.summary.identity_findings == 0
    assert result.summary.escalation_findings == 1
    assert result.attack_paths[0].path == ["frontend", "orchestrator"]
    assert {finding.pattern for finding in result.escalation_findings} == {
        "service_to_control_plane",
    }


def test_attack_paths_ignore_flat_trust_paths():
    architecture = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "gateway", "type": "api_gateway", "trust_level": "external"},
                {"id": "cdn-cache", "type": "cache", "trust_level": "external"},
            ],
            "edges": [
                {"from": "gateway", "to": "cdn-cache", "protocol": "https"},
            ],
        }
    )

    result = analyze_architecture(architecture)

    assert result.summary.attack_paths == 0
    assert result.summary.identity_findings == 0
    assert result.summary.escalation_findings == 0
