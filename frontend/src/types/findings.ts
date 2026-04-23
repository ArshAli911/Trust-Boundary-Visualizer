import type { TrustLevel } from "./architecture";

export interface BoundaryFinding {
    source: string; target: string;
    from_trust: TrustLevel; to_trust: TrustLevel;
    severity: string; rationale: string;
}

export interface AttackPathFinding {
    path: string[]; path_trust_levels: TrustLevel[];
    source: string; sink: string;
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
  path: string[]; severity: string; pattern: string;
  rationale: string; recommendation: string;
}

export interface DataExposureFinding {
  source: string; target: string;
  severity: string; rationale: string; recommendation: string;
}

export interface LateralMovementFinding {
  path: string[]; trust_level: string;
  severity: string; rationale: string; recommendation: string;
}

export interface MisconfigurationFinding {
  node: string; pattern: string;
  severity: string; rationale: string; recommendation: string;
}

export interface ReportEntry {
  title: string; risk: string; recommendation: string; path: string[];
}
