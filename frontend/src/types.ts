export type TrustLevel = "external" | "internal" | "privileged" | "restricted";

export type IdentityMechanism = "jwt" | "mtls" | "api_key" | "service_account" | "none";

export type AuthorizationModel = "role_based" | "attribute_based" | "policy_based" | "none";

export interface ArchitectureNode {
  id: string;
  type: string;
  trust_level: TrustLevel;
  label?: string | null;
  description?: string | null;
  auth?: IdentityMechanism | null;
  authorization?: AuthorizationModel | null;
  accepts_untrusted_input: boolean;
  exposes_public_endpoint: boolean;
  tags: string[];
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  protocol?: string | null;
  label?: string | null;
  data_classification?: string | null;
  carries_identity: boolean;
  transforms_input: boolean;
  queue: boolean;
}

export interface ArchitectureDocument {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  metadata: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  trust_level: TrustLevel;
  auth?: IdentityMechanism | null;
  authorization?: AuthorizationModel | null;
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
