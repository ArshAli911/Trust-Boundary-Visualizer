import type { ArchitectureDocument } from "./architecture";
import type {
  AttackPathFinding,
  BoundaryFinding,
  EscalationFinding,
  IdentityFinding,
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
  };
  trust_boundaries: BoundaryFinding[];
  attack_paths: AttackPathFinding[];
  identity_findings: IdentityFinding[];
  escalation_findings: EscalationFinding[];
  report: ReportEntry[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}
