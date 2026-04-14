export type TrustLevel = "external" | "internal" | "privileged" | "restricted";
export type IdentityMechanism = "jwt" | "mtls" | "api_key" | "service_account" | "none";
export type AuthorizationModel = "role_based" | "attribute_based" | "policy_based" | "none";

export interface ArchitechtureNode{
    from: string;
  to: string;
  protocol?: string | null;
  label?: string | null;
  data_classification?: string | null;
  carries_identity: boolean;
  transforms_input: boolean;
  queue: boolean;
}
export interface ArchitechtureEdge{
    id: string;
    type: string;
    trust_level: string;
    label?: string|null;
    description?: string|null;
    auth?: IdentityMechanism| null;
    authorization?: AuthorizationModel| null;
    accepts_untrusted_input: boolean;
    exposes_public_endpoints: boolean;
    tags: string[];
    
}


export interface ArchitectureDocument {
  nodes: ArchitechtureNode[];
  edges: ArchitechtureEdge[];
  metadata: Record<string, unknown>;
}

