from app.analysis import analyze_architecture
from app.models import ArchitectureDocument


def test_attack_path_and_identity_risk_are_detected():
    architecture = ArchitectureDocument.model_validate(
        {
            "nodes": [
                {"id": "gateway", "type": "api_gateway", "trust_level": "external"},
                {
                    "id": "worker",
                    "type": "background_worker",
                    "trust_level": "privileged",
                    "auth": "service_account",
                },
                {"id": "database", "type": "database", "trust_level": "restricted"},
            ],
            "edges": [
                {"from": "gateway", "to": "worker", "queue": True, "carries_identity": False},
                {"from": "worker", "to": "database"},
            ],
        }
    )

    result = analyze_architecture(architecture)

    assert result.summary.attack_paths == 1
    assert result.summary.identity_findings == 1
    assert result.summary.escalation_findings >= 2
    assert result.attack_paths[0].path == ["gateway", "worker", "database"]
