from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TrustLevel(str, Enum):
    EXTERNAL = "external"
    INTERNAL = "internal"
    PRIVILEGED = "privileged"
    RESTRICTED = "restricted"


class IdentityMechanism(str, Enum):
    JWT = "jwt"
    MTLS = "mtls"
    API_KEY = "api_key"
    SERVICE_ACCOUNT = "service_account"
    NONE = "none"


class AuthorizationModel(str, Enum):
    ROLE_BASED = "role_based"
    ATTRIBUTE_BASED = "attribute_based"
    POLICY_BASED = "policy_based"
    NONE = "none"


class ArchitectureNode(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(min_length=1)
    type: str = Field(min_length=1)
    trust_level: TrustLevel
    label: str | None = None
    description: str | None = None
    auth: IdentityMechanism | None = None
    authorization: AuthorizationModel | None = None
    accepts_untrusted_input: bool = False
    exposes_public_endpoint: bool = False
    tags: list[str] = Field(default_factory=list)


class ArchitectureEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source: str = Field(alias="from", min_length=1)
    target: str = Field(alias="to", min_length=1)
    protocol: str | None = None
    label: str | None = None
    data_classification: str | None = None
    carries_identity: bool = True
    transforms_input: bool = False
    queue: bool = False


class ArchitectureDocument(BaseModel):
    nodes: list[ArchitectureNode]
    edges: list[ArchitectureEdge]
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("nodes")
    @classmethod
    def validate_unique_node_ids(
        cls, nodes: list[ArchitectureNode]
    ) -> list[ArchitectureNode]:
        ids = [node.id for node in nodes]
        if len(ids) != len(set(ids)):
            raise ValueError("Node ids must be unique.")
        return nodes

    @model_validator(mode="after")
    def validate_edge_endpoints(self) -> "ArchitectureDocument":
        node_ids = {node.id for node in self.nodes}
        for edge in self.edges:
            if edge.source not in node_ids or edge.target not in node_ids:
                raise ValueError(
                    f"Edge '{edge.source} -> {edge.target}' references an unknown node."
                )
        return self


class AnalyzeRequest(BaseModel):
    architecture: ArchitectureDocument | None = None
    document: str | None = None
    format: str = "auto"

    @model_validator(mode="after")
    def validate_payload(self) -> "AnalyzeRequest":
        if self.architecture is None and not self.document:
            raise ValueError("Provide either 'architecture' or 'document'.")
        return self


class BoundaryFinding(BaseModel):
    source: str
    target: str
    from_trust: TrustLevel
    to_trust: TrustLevel
    severity: str
    rationale: str


class AttackPathFinding(BaseModel):
    path: list[str]
    path_trust_levels: list[TrustLevel]
    source: str
    sink: str
    severity: str
    rationale: str
    recommendation: str


class IdentityFinding(BaseModel):
    source: str
    target: str
    severity: str
    rationale: str
    recommendation: str


class EscalationFinding(BaseModel):
    path: list[str]
    severity: str
    pattern: str
    rationale: str
    recommendation: str


class DataExposureFinding(BaseModel):
    source: str
    target: str
    severity: str
    rationale: str
    recommendation: str


class LateralMovementFinding(BaseModel):
    path: list[str]
    trust_level: TrustLevel
    severity: str
    rationale: str
    recommendation: str


class MisconfigurationFinding(BaseModel):
    node: str
    pattern: str
    severity: str
    rationale: str
    recommendation: str


class ReportEntry(BaseModel):
    title: str
    risk: str
    recommendation: str
    path: list[str] = Field(default_factory=list)


class GraphNodeView(BaseModel):
    id: str
    label: str
    type: str
    trust_level: TrustLevel
    auth: IdentityMechanism | None = None
    authorization: AuthorizationModel | None = None
    flags: list[str] = Field(default_factory=list)


class GraphEdgeView(BaseModel):
    source: str
    target: str
    label: str
    protocol: str | None = None
    carries_identity: bool
    flags: list[str] = Field(default_factory=list)


class AnalysisSummary(BaseModel):
    node_count: int
    edge_count: int
    trust_boundaries: int
    attack_paths: int
    identity_findings: int
    escalation_findings: int
    data_exposure_findings: int
    lateral_movement_findings: int
    misconfiguration_findings: int


class AnalysisResponse(BaseModel):
    architecture: ArchitectureDocument
    summary: AnalysisSummary
    trust_boundaries: list[BoundaryFinding]
    attack_paths: list[AttackPathFinding]
    identity_findings: list[IdentityFinding]
    escalation_findings: list[EscalationFinding]
    data_exposure_findings: list[DataExposureFinding]
    lateral_movement_findings: list[LateralMovementFinding]
    misconfiguration_findings: list[MisconfigurationFinding]
    report: list[ReportEntry]
    graph: dict[str, list[GraphNodeView] | list[GraphEdgeView]]
