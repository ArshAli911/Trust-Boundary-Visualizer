export type TrustLevel = "external" | "internal" | "privileged" | "restricted";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  trust_level: TrustLevel;
  auth?: string | null;
  authorization?: string | null;
  flags: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  protocol?: string | null;
  carries_identity: boolean;
  flags: string[];
}

export interface BoundaryFinding {
  source: string;
  target: string;
  from_trust: TrustLevel;
  to_trust: TrustLevel;
  severity: string;
  rationale: string;
}

export interface AttackPathFinding {
  path: string[];
  path_trust_levels: TrustLevel[];
  source: string;
  sink: string;
  severity: string;
  rationale: string;
  recommendation: string;
}

export interface IdentityFinding {
  source: string;
  target: string;
  severity: string;
  rationale: string;
  recommendation: string;
}

export interface EscalationFinding {
  path: string[];
  severity: string;
  pattern: string;
  rationale: string;
  recommendation: string;
}

export interface ReportEntry {
  title: string;
  risk: string;
  recommendation: string;
  path: string[];
}

export interface AnalysisResponse {
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
