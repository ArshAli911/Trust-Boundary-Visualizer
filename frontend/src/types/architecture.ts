export type TrustLevel = "external" | "internal" | "privileged" | "restricted";

export type IdentityMechanism = "jwt" | "mtls" | "api key" | "service account" | "none";

export type AuthorizationModel = "role based" | "attribute based" | "policy based" | "none";

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
