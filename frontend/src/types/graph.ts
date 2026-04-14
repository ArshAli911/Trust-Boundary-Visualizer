import type { AuthorizationModel, IdentityMechanism, TrustLevel } from "./architecture";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  trust_level: TrustLevel;
  auth?: IdentityMechanism | null;
  authorization?: AuthorizationModel | null;
  flags: string[];
  position?: { x: number; y: number };
}


export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  protocol?: string | null;
  carries_identity: boolean;
  flags: string[];
}
