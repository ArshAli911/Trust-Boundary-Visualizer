import type { ArchitectureDocument } from "./architecture";
import type {
  AttackPathFinding,
  BoundaryFinding,
  DataExposureFinding,
  EscalationFinding,
  IdentityFinding,
  LateralMovementFinding,
  MisconfigurationFinding,
  ReportEntry
} from "./findings";
import type { GraphEdge, GraphNode } from "./graph";

export interface AnalysisResponse {
  architecture: ArchitectureDocument;
  summary: {
    node_count: number;
    edge_count: number;
    trust_boundaries: number;
    attack_paths: number;
    identity_findings: number;
    escalation_findings: number;
    data_exposure_findings: number;
    lateral_movement_findings: number;
    misconfiguration_findings: number;
  };
  trust_boundaries: BoundaryFinding[];
  attack_paths: AttackPathFinding[];
  identity_findings: IdentityFinding[];
  escalation_findings: EscalationFinding[];
  data_exposure_findings: DataExposureFinding[];
  lateral_movement_findings: LateralMovementFinding[];
  misconfiguration_findings: MisconfigurationFinding[];
  report: ReportEntry[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}
