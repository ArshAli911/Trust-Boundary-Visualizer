from __future__ import annotations

from collections.abc import Iterable

import networkx as nx

from .models import (
    AnalysisResponse,
    AnalysisSummary,
    ArchitectureDocument,
    AttackPathFinding,
    BoundaryFinding,
    DataExposureFinding,
    EscalationFinding,
    GraphEdgeView,
    GraphNodeView,
    IdentityFinding,
    LateralMovementFinding,
    MisconfigurationFinding,
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
SECURE_PROTOCOLS = {"https", "grpc", "mtls", "tls", "ssh"}
DATA_STORE_TYPES = {"database", "cache", "object_store", "data_warehouse"}


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
    data_exposure_findings = detect_data_exposure(graph)
    lateral_movement_findings = detect_lateral_movement(graph)
    misconfiguration_findings = (
        detect_insecure_channels(graph)
        + detect_missing_auth_at_entry(graph)
        + detect_direct_data_access(graph)
        + detect_single_points_of_failure(graph)
        + detect_orphan_nodes(graph)
    )
    report = build_report(
        attack_paths, identity_findings, escalation_findings,
        data_exposure_findings, lateral_movement_findings, misconfiguration_findings,
    )
    graph_view = build_graph_view(
        graph, boundaries, attack_paths, identity_findings, escalation_findings,
        data_exposure_findings, lateral_movement_findings, misconfiguration_findings,
    )
    summary = AnalysisSummary(
        node_count=graph.number_of_nodes(),
        edge_count=graph.number_of_edges(),
        trust_boundaries=len(boundaries),
        attack_paths=len(attack_paths),
        identity_findings=len(identity_findings),
        escalation_findings=len(escalation_findings),
        data_exposure_findings=len(data_exposure_findings),
        lateral_movement_findings=len(lateral_movement_findings),
        misconfiguration_findings=len(misconfiguration_findings),
    )
    return AnalysisResponse(
        architecture=architecture,
        summary=summary,
        trust_boundaries=boundaries,
        attack_paths=attack_paths,
        identity_findings=identity_findings,
        escalation_findings=escalation_findings,
        data_exposure_findings=data_exposure_findings,
        lateral_movement_findings=lateral_movement_findings,
        misconfiguration_findings=misconfiguration_findings,
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
    data_exposure_findings: Iterable[DataExposureFinding] = (),
    lateral_movement_findings: Iterable[LateralMovementFinding] = (),
    misconfiguration_findings: Iterable[MisconfigurationFinding] = (),
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

    for finding in data_exposure_findings:
        report.append(
            ReportEntry(
                title=f"Data Exposure: {finding.source} -> {finding.target}",
                risk=finding.rationale,
                recommendation=finding.recommendation,
                path=[finding.source, finding.target],
            )
        )

    for finding in lateral_movement_findings:
        report.append(
            ReportEntry(
                title=f"Lateral Movement Risk ({finding.trust_level.value} zone)",
                risk=finding.rationale,
                recommendation=finding.recommendation,
                path=finding.path,
            )
        )

    for finding in misconfiguration_findings:
        report.append(
            ReportEntry(
                title=f"Misconfiguration: {finding.pattern} on {finding.node}",
                risk=finding.rationale,
                recommendation=finding.recommendation,
                path=[finding.node],
            )
        )
    return report


def build_graph_view(
    graph: nx.DiGraph,
    boundaries: Iterable[BoundaryFinding],
    attack_paths: Iterable[AttackPathFinding],
    identity_findings: Iterable[IdentityFinding],
    escalation_findings: Iterable[EscalationFinding],
    data_exposure_findings: Iterable[DataExposureFinding] = (),
    lateral_movement_findings: Iterable[LateralMovementFinding] = (),
    misconfiguration_findings: Iterable[MisconfigurationFinding] = (),
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
    exposure_edges = {(f.source, f.target) for f in data_exposure_findings}
    lateral_edges: set[tuple[str, str]] = set()
    lateral_node_ids: set[str] = set()
    for finding in lateral_movement_findings:
        for i in range(len(finding.path) - 1):
            lateral_edges.add((finding.path[i], finding.path[i + 1]))
        lateral_node_ids.update(finding.path)
    misconfig_nodes = {f.node for f in misconfiguration_findings}

    node_flags: dict[str, set[str]] = {node_id: set() for node_id in graph.nodes}
    for node_id in attack_node_ids:
        node_flags[node_id].add("attack-path")
    for finding in escalation_findings:
        for node_id in finding.path:
            node_flags[node_id].add("escalation")
    for node_id in lateral_node_ids:
        if node_id in node_flags:
            node_flags[node_id].add("lateral-movement")
    for node_id in misconfig_nodes:
        if node_id in node_flags:
            node_flags[node_id].add("misconfiguration")

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
        if (source, target) in exposure_edges:
            flags.add("data-exposure")
        if (source, target) in lateral_edges:
            flags.add("lateral-movement")
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


# ---------------------------------------------------------------------------
# New heuristics
# ---------------------------------------------------------------------------


def detect_data_exposure(graph: nx.DiGraph) -> list[DataExposureFinding]:
    """Sensitive data flowing outward to a lower trust zone."""
    findings: list[DataExposureFinding] = []
    for source, target, edge_data in graph.edges(data=True):
        source_level = TrustLevel(graph.nodes[source]["trust_level"])
        target_level = TrustLevel(graph.nodes[target]["trust_level"])
        outward = TRUST_ORDER[source_level] > TRUST_ORDER[target_level]
        if not outward:
            continue

        classification = edge_data.get("data_classification")
        if classification:
            findings.append(
                DataExposureFinding(
                    source=source,
                    target=target,
                    severity="high" if target_level == TrustLevel.EXTERNAL else "medium",
                    rationale=(
                        f"Data classified as '{classification}' flows from {source} "
                        f"({source_level.value}) to {target} ({target_level.value}), "
                        "crossing outward into a lower trust zone."
                    ),
                    recommendation="Encrypt or redact sensitive fields before crossing trust boundaries outward.",
                )
            )
        elif target_level == TrustLevel.EXTERNAL and source_level in SENSITIVE_LEVELS:
            findings.append(
                DataExposureFinding(
                    source=source,
                    target=target,
                    severity="high",
                    rationale=(
                        f"A {source_level.value} component ({source}) sends data directly "
                        f"to an external component ({target}) without declared data classification."
                    ),
                    recommendation="Classify outbound data, apply egress filtering, and avoid exposing internal state.",
                )
            )
    return findings


def detect_insecure_channels(graph: nx.DiGraph) -> list[MisconfigurationFinding]:
    """Edges crossing trust boundaries over unencrypted or unspecified protocols."""
    findings: list[MisconfigurationFinding] = []
    for source, target, edge_data in graph.edges(data=True):
        source_level = TrustLevel(graph.nodes[source]["trust_level"])
        target_level = TrustLevel(graph.nodes[target]["trust_level"])
        if source_level == target_level:
            continue
        protocol = (edge_data.get("protocol") or "").lower()
        if protocol and protocol in SECURE_PROTOCOLS:
            continue
        channel_desc = f"'{protocol}'" if protocol else "no declared protocol"
        findings.append(
            MisconfigurationFinding(
                node=source,
                pattern="insecure_channel",
                severity="high" if TrustLevel.EXTERNAL in (source_level, target_level) else "medium",
                rationale=(
                    f"The edge {source} -> {target} crosses a trust boundary using {channel_desc}. "
                    "Data in transit may be intercepted or tampered with."
                ),
                recommendation="Use TLS, mTLS, or an encrypted transport for all cross-boundary communication.",
            )
        )
    return findings


def detect_lateral_movement(graph: nx.DiGraph) -> list[LateralMovementFinding]:
    """Paths of 3+ hops within the same trust level enabling horizontal spread."""
    findings: list[LateralMovementFinding] = []
    seen_paths: set[tuple[str, ...]] = set()

    for node_id, node_data in graph.nodes(data=True):
        level = TrustLevel(node_data["trust_level"])
        # BFS collecting same-level chains
        visited: set[str] = set()
        stack: list[list[str]] = [[node_id]]
        while stack:
            path = stack.pop()
            current = path[-1]
            if current in visited:
                continue
            visited.add(current)
            for neighbor in graph.successors(current):
                neighbor_level = TrustLevel(graph.nodes[neighbor]["trust_level"])
                if neighbor_level != level or neighbor in visited:
                    continue
                new_path = path + [neighbor]
                if len(new_path) >= 3:
                    key = tuple(new_path)
                    if key not in seen_paths:
                        seen_paths.add(key)
                        findings.append(
                            LateralMovementFinding(
                                path=new_path,
                                trust_level=level,
                                severity="medium",
                                rationale=(
                                    f"A chain of {len(new_path)} components at '{level.value}' "
                                    f"trust ({' -> '.join(new_path)}) allows lateral "
                                    "movement within the same zone."
                                ),
                                recommendation=(
                                    "Segment the network within this trust level and apply "
                                    "micro-segmentation or zero-trust principles."
                                ),
                            )
                        )
                stack.append(new_path)
    return findings


def detect_single_points_of_failure(graph: nx.DiGraph) -> list[MisconfigurationFinding]:
    """Nodes with high betweenness centrality — architectural chokepoints."""
    findings: list[MisconfigurationFinding] = []
    if graph.number_of_nodes() < 3:
        return findings

    centrality = nx.betweenness_centrality(graph)
    if not centrality:
        return findings

    values = sorted(centrality.values())
    # Top-quartile threshold, but never flag nodes below 0.25
    threshold = max(values[len(values) * 3 // 4], 0.25)

    for node_id, score in centrality.items():
        if score >= threshold:
            findings.append(
                MisconfigurationFinding(
                    node=node_id,
                    pattern="single_point_of_failure",
                    severity="medium",
                    rationale=(
                        f"{node_id} has a betweenness centrality of {score:.2f}, making it "
                        "a critical chokepoint. Compromise or failure here impacts many paths."
                    ),
                    recommendation="Add redundancy, circuit breakers, or alternative routes to reduce blast radius.",
                )
            )
    return findings


def detect_missing_auth_at_entry(graph: nx.DiGraph) -> list[MisconfigurationFinding]:
    """Public-facing nodes without any authentication mechanism."""
    findings: list[MisconfigurationFinding] = []
    for node_id, data in graph.nodes(data=True):
        is_entry = data.get("exposes_public_endpoint") or data.get("accepts_untrusted_input")
        if not is_entry:
            continue
        if data.get("auth") is not None:
            continue
        findings.append(
            MisconfigurationFinding(
                node=node_id,
                pattern="missing_auth_at_entry",
                severity="high",
                rationale=(
                    f"{node_id} accepts untrusted or public traffic but has no "
                    "authentication mechanism configured."
                ),
                recommendation="Add authentication (JWT, API key, OAuth) at the entry point before processing requests.",
            )
        )
    return findings


def detect_direct_data_access(graph: nx.DiGraph) -> list[MisconfigurationFinding]:
    """Low-trust nodes with a direct edge to a database or restricted node."""
    findings: list[MisconfigurationFinding] = []
    for source, target, _edge_data in graph.edges(data=True):
        source_level = TrustLevel(graph.nodes[source]["trust_level"])
        target_type = graph.nodes[target]["type"]
        target_level = TrustLevel(graph.nodes[target]["trust_level"])
        if source_level not in {TrustLevel.EXTERNAL, TrustLevel.INTERNAL}:
            continue
        if target_type not in DATA_STORE_TYPES and target_level != TrustLevel.RESTRICTED:
            continue
        # Skip if there's an intermediary — this checks *direct* edges only
        findings.append(
            MisconfigurationFinding(
                node=source,
                pattern="direct_data_access",
                severity="critical" if source_level == TrustLevel.EXTERNAL else "high",
                rationale=(
                    f"{source} ({source_level.value}) has a direct connection to "
                    f"{target} ({target_type}, {target_level.value}) with no intermediary service."
                ),
                recommendation="Route data access through an application tier or API gateway that enforces authorization.",
            )
        )
    return findings


def detect_orphan_nodes(graph: nx.DiGraph) -> list[MisconfigurationFinding]:
    """Nodes with no incoming or outgoing edges — likely incomplete architecture."""
    findings: list[MisconfigurationFinding] = []
    for node_id in graph.nodes:
        if graph.in_degree(node_id) == 0 and graph.out_degree(node_id) == 0:
            findings.append(
                MisconfigurationFinding(
                    node=node_id,
                    pattern="orphan_node",
                    severity="low",
                    rationale=(
                        f"{node_id} has no connections. It is either unused or the "
                        "architecture is incomplete."
                    ),
                    recommendation="Connect this node to the architecture or remove it if unused.",
                )
            )
    return findings
