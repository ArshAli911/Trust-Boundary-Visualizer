from __future__ import annotations

from collections.abc import Iterable

import networkx as nx

from .models import (
    AnalysisResponse,
    AnalysisSummary,
    ArchitectureDocument,
    AttackPathFinding,
    BoundaryFinding,
    EscalationFinding,
    GraphEdgeView,
    GraphNodeView,
    IdentityFinding,
    ReportEntry,
    TrustLevel,
)

TRUST_ORDER = {
    TrustLevel.EXTERNAL: 0,
    TrustLevel.INTERNAL: 1,
    TrustLevel.PRIVILEGED: 2,
    TrustLevel.RESTRICTED: 3,
}

SENSITIVE_LEVELS = {TrustLevel.PRIVILEGED, TrustLevel.RESTRICTED}
UNTRUSTED_LEVELS = {TrustLevel.EXTERNAL}


def build_graph(architecture: ArchitectureDocument) -> nx.DiGraph:
    graph = nx.DiGraph()
    for node in architecture.nodes:
        graph.add_node(node.id, **node.model_dump())
    for edge in architecture.edges:
        graph.add_edge(edge.source, edge.target, **edge.model_dump())
    return graph


def analyze_architecture(architecture: ArchitectureDocument) -> AnalysisResponse:
    graph = build_graph(architecture)
    boundaries = detect_trust_boundaries(graph)
    attack_paths = detect_attack_paths(graph)
    identity_findings = detect_identity_findings(graph)
    escalation_findings = detect_privilege_escalations(graph, attack_paths)
    report = build_report(attack_paths, identity_findings, escalation_findings)
    graph_view = build_graph_view(
        graph, boundaries, attack_paths, identity_findings, escalation_findings
    )
    summary = AnalysisSummary(
        node_count=graph.number_of_nodes(),
        edge_count=graph.number_of_edges(),
        trust_boundaries=len(boundaries),
        attack_paths=len(attack_paths),
        identity_findings=len(identity_findings),
        escalation_findings=len(escalation_findings),
    )
    return AnalysisResponse(
        architecture=architecture,
        summary=summary,
        trust_boundaries=boundaries,
        attack_paths=attack_paths,
        identity_findings=identity_findings,
        escalation_findings=escalation_findings,
        report=report,
        graph=graph_view,
    )


def detect_trust_boundaries(graph: nx.DiGraph) -> list[BoundaryFinding]:
    findings: list[BoundaryFinding] = []
    for source, target, edge_data in graph.edges(data=True):
        source_level = TrustLevel(graph.nodes[source]["trust_level"])
        target_level = TrustLevel(graph.nodes[target]["trust_level"])
        if source_level == target_level:
            continue

        severity = classify_boundary_severity(source_level, target_level)
        direction = "into" if TRUST_ORDER[target_level] > TRUST_ORDER[source_level] else "out of"
        protocol = edge_data.get("protocol") or "an unspecified channel"
        findings.append(
            BoundaryFinding(
                source=source,
                target=target,
                from_trust=source_level,
                to_trust=target_level,
                severity=severity,
                rationale=(
                    f"Traffic crosses {direction} a higher trust zone via {protocol}. "
                    "Validate input handling and authorization at this boundary."
                ),
            )
        )
    return findings


def detect_attack_paths(graph: nx.DiGraph) -> list[AttackPathFinding]:
    findings: list[AttackPathFinding] = []
    sources = find_untrusted_sources(graph)
    sinks = [node for node, data in graph.nodes(data=True) if data["trust_level"] in SENSITIVE_LEVELS]

    for source in sources:
        for sink in sinks:
            if source == sink or not nx.has_path(graph, source, sink):
                continue
            path = nx.shortest_path(graph, source, sink)
            path_levels = [TrustLevel(graph.nodes[node]["trust_level"]) for node in path]
            if not path_crosses_boundary(path_levels):
                continue

            sink_level = path_levels[-1]
            severity = "critical" if sink_level == TrustLevel.RESTRICTED else "high"
            findings.append(
                AttackPathFinding(
                    path=path,
                    path_trust_levels=path_levels,
                    source=source,
                    sink=sink,
                    severity=severity,
                    rationale=(
                        f"Untrusted input can traverse {len(path) - 1} hops from {source} "
                        f"to {sink}, reaching a {sink_level.value} component."
                    ),
                    recommendation=recommend_for_sink(graph.nodes[sink]["type"], sink_level),
                )
            )

    return dedupe_paths(findings)


def detect_identity_findings(graph: nx.DiGraph) -> list[IdentityFinding]:
    findings: list[IdentityFinding] = []
    for source, target, edge_data in graph.edges(data=True):
        source_node = graph.nodes[source]
        target_node = graph.nodes[target]
        source_level = TrustLevel(source_node["trust_level"])
        target_level = TrustLevel(target_node["trust_level"])
        crossing_inward = TRUST_ORDER[target_level] > TRUST_ORDER[source_level]
        if not crossing_inward:
            continue

        target_auth = target_node.get("auth")
        carries_identity = bool(edge_data.get("carries_identity", True))
        source_auth = source_node.get("auth")

        if not carries_identity:
            findings.append(
                IdentityFinding(
                    source=source,
                    target=target,
                    severity="high",
                    rationale=(
                        f"Identity context is dropped on the path from {source} to {target} "
                        "while crossing into a more trusted zone."
                    ),
                    recommendation="Preserve caller identity or enforce re-authentication at the target.",
                )
            )
            continue

        if target_auth is None and target_level in SENSITIVE_LEVELS:
            findings.append(
                IdentityFinding(
                    source=source,
                    target=target,
                    severity="medium",
                    rationale=(
                        f"{target} receives requests from a lower trust level without an explicit "
                        "authentication mechanism configured."
                    ),
                    recommendation="Require mTLS, JWT validation, or a service account check at the boundary.",
                )
            )
            continue

        if source_level in UNTRUSTED_LEVELS and source_auth is None and target_auth is not None:
            findings.append(
                IdentityFinding(
                    source=source,
                    target=target,
                    severity="medium",
                    rationale=(
                        f"{target} relies on {target_auth}, but the upstream node {source} has "
                        "no declared identity verification before crossing the boundary."
                    ),
                    recommendation="Terminate external identity at the edge and mint internal identity explicitly.",
                )
            )
    return findings


def detect_privilege_escalations(
    graph: nx.DiGraph, attack_paths: Iterable[AttackPathFinding]
) -> list[EscalationFinding]:
    findings: list[EscalationFinding] = []
    attack_paths_list = list(attack_paths)
    for path_finding in attack_paths_list:
        path = path_finding.path
        node_types = [graph.nodes[node]["type"] for node in path]
        if "background_worker" in node_types and path_finding.sink:
            findings.append(
                EscalationFinding(
                    path=path,
                    severity="high",
                    pattern="untrusted_input_to_privileged_worker",
                    rationale=(
                        "A path from an untrusted source reaches a background worker before "
                        "touching sensitive infrastructure."
                    ),
                    recommendation="Sandbox worker jobs, validate queued messages, and scope worker credentials.",
                )
            )

        if "database" in node_types and path_finding.path_trust_levels[-1] == TrustLevel.RESTRICTED:
            findings.append(
                EscalationFinding(
                    path=path,
                    severity="critical",
                    pattern="untrusted_input_to_restricted_data_store",
                    rationale=(
                        "The attack path terminates at a restricted datastore, indicating a "
                        "direct architectural path to high-value data."
                    ),
                    recommendation="Introduce an isolation tier or brokered access pattern before the datastore.",
                )
            )

    for source, target, edge_data in graph.edges(data=True):
        target_type = graph.nodes[target]["type"]
        if edge_data.get("queue") and graph.nodes[target]["trust_level"] == TrustLevel.PRIVILEGED:
            findings.append(
                EscalationFinding(
                    path=[source, target],
                    severity="high",
                    pattern="queue_to_privileged_worker",
                    rationale=(
                        "Queued data flows directly into a privileged component, which can turn "
                        "message tampering into privilege escalation."
                    ),
                    recommendation="Authenticate producers, validate message schemas, and reduce worker privileges.",
                )
            )
        if target_type in {"control_plane_api", "orchestrator", "cluster_admin"}:
            findings.append(
                EscalationFinding(
                    path=[source, target],
                    severity="critical",
                    pattern="service_to_control_plane",
                    rationale=(
                        f"{source} can reach {target}, a control-plane style component. This is a "
                        "high-impact escalation route if service credentials are compromised."
                    ),
                    recommendation="Place the control plane on a separate trust boundary and require strong identity.",
                )
            )
    return dedupe_escalations(findings)


def build_report(
    attack_paths: Iterable[AttackPathFinding],
    identity_findings: Iterable[IdentityFinding],
    escalation_findings: Iterable[EscalationFinding],
) -> list[ReportEntry]:
    report: list[ReportEntry] = []
    for index, path in enumerate(attack_paths, start=1):
        report.append(
            ReportEntry(
                title=f"Possible Attack Path #{index}",
                risk=path.rationale,
                recommendation=path.recommendation,
                path=path.path,
            )
        )

    for finding in identity_findings:
        report.append(
            ReportEntry(
                title=f"Identity Propagation Risk: {finding.source} -> {finding.target}",
                risk=finding.rationale,
                recommendation=finding.recommendation,
                path=[finding.source, finding.target],
            )
        )

    for finding in escalation_findings:
        report.append(
            ReportEntry(
                title=f"Privilege Escalation Pattern: {finding.pattern}",
                risk=finding.rationale,
                recommendation=finding.recommendation,
                path=finding.path,
            )
        )
    return report


def build_graph_view(
    graph: nx.DiGraph,
    boundaries: Iterable[BoundaryFinding],
    attack_paths: Iterable[AttackPathFinding],
    identity_findings: Iterable[IdentityFinding],
    escalation_findings: Iterable[EscalationFinding],
) -> dict[str, list[GraphNodeView] | list[GraphEdgeView]]:
    attack_node_ids = {node for finding in attack_paths for node in finding.path}
    attack_edges = {
        (finding.path[index], finding.path[index + 1])
        for finding in attack_paths
        for index in range(len(finding.path) - 1)
    }
    boundary_edges = {(finding.source, finding.target) for finding in boundaries}
    identity_edges = {(finding.source, finding.target) for finding in identity_findings}
    escalation_edges = {
        (finding.path[index], finding.path[index + 1])
        for finding in escalation_findings
        for index in range(len(finding.path) - 1)
    }

    node_flags: dict[str, set[str]] = {node_id: set() for node_id in graph.nodes}
    for node_id in attack_node_ids:
        node_flags[node_id].add("attack-path")
    for finding in escalation_findings:
        for node_id in finding.path:
            node_flags[node_id].add("escalation")

    nodes = [
        GraphNodeView(
            id=node_id,
            label=node_data.get("label") or node_id,
            type=node_data["type"],
            trust_level=TrustLevel(node_data["trust_level"]),
            auth=node_data.get("auth"),
            authorization=node_data.get("authorization"),
            flags=sorted(node_flags[node_id]),
        )
        for node_id, node_data in graph.nodes(data=True)
    ]
    edges = []
    for source, target, edge_data in graph.edges(data=True):
        flags: set[str] = set()
        if (source, target) in attack_edges:
            flags.add("attack-path")
        if (source, target) in boundary_edges:
            flags.add("trust-boundary")
        if (source, target) in identity_edges:
            flags.add("identity-risk")
        if (source, target) in escalation_edges:
            flags.add("escalation")
        edges.append(
            GraphEdgeView(
                source=source,
                target=target,
                label=edge_data.get("label") or edge_data.get("protocol") or "",
                protocol=edge_data.get("protocol"),
                carries_identity=bool(edge_data.get("carries_identity", True)),
                flags=sorted(flags),
            )
        )
    return {"nodes": nodes, "edges": edges}


def classify_boundary_severity(source: TrustLevel, target: TrustLevel) -> str:
    delta = TRUST_ORDER[target] - TRUST_ORDER[source]
    if delta >= 2:
        return "high"
    if delta == 1:
        return "medium"
    return "low"


def find_untrusted_sources(graph: nx.DiGraph) -> list[str]:
    sources = []
    for node_id, data in graph.nodes(data=True):
        if data["trust_level"] in UNTRUSTED_LEVELS:
            sources.append(node_id)
            continue
        if data.get("accepts_untrusted_input") or data.get("exposes_public_endpoint"):
            sources.append(node_id)
    return sources


def path_crosses_boundary(path_levels: list[TrustLevel]) -> bool:
    for index in range(len(path_levels) - 1):
        if TRUST_ORDER[path_levels[index + 1]] > TRUST_ORDER[path_levels[index]]:
            return True
    return False


def recommend_for_sink(node_type: str, sink_level: TrustLevel) -> str:
    if node_type == "database" or sink_level == TrustLevel.RESTRICTED:
        return "Introduce a broker or policy enforcement tier before the datastore and narrow credentials."
    if node_type == "background_worker":
        return "Constrain worker permissions and validate all job inputs before execution."
    return "Add boundary validation, explicit authorization, and stronger isolation between tiers."


def dedupe_paths(findings: Iterable[AttackPathFinding]) -> list[AttackPathFinding]:
    seen: set[tuple[str, ...]] = set()
    deduped: list[AttackPathFinding] = []
    for finding in findings:
        key = tuple(finding.path)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(finding)
    return deduped


def dedupe_escalations(findings: Iterable[EscalationFinding]) -> list[EscalationFinding]:
    seen: set[tuple[str, tuple[str, ...]]] = set()
    deduped: list[EscalationFinding] = []
    for finding in findings:
        key = (finding.pattern, tuple(finding.path))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(finding)
    return deduped
