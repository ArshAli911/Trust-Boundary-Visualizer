# Frontend Code Guide — What Goes In Each File

> [!NOTE]
> Your filenames use `architechture` (typo). I'll match your naming. Also [main.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/main.tsx) has a bug — `import { ReactDOM } from "react"` should be `import ReactDOM from "react-dom/client"`.

---

## 1. `types/architechture.ts`

```typescript
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
```

---

## 2. [types/graph.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types/graph.ts)

```typescript
import type { TrustLevel, IdentityMechanism, AuthorizationModel } from "./architechture";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  trust_level: TrustLevel;
  position?: { x: number; y: number };
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
```

---

## 3. [types/findings.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types/findings.ts)

```typescript
import type { TrustLevel } from "./architechture";

export interface BoundaryFinding {
  source: string; target: string;
  from_trust: TrustLevel; to_trust: TrustLevel;
  severity: string; rationale: string;
}

export interface AttackPathFinding {
  path: string[]; path_trust_levels: TrustLevel[];
  source: string; sink: string;
  severity: string; rationale: string; recommendation: string;
}

export interface IdentityFinding {
  source: string; target: string;
  severity: string; rationale: string; recommendation: string;
}

export interface EscalationFinding {
  path: string[]; severity: string; pattern: string;
  rationale: string; recommendation: string;
}

export interface ReportEntry {
  title: string; risk: string; recommendation: string; path: string[];
}
```

---

## 4. [types/api.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types/api.ts)

```typescript
import type { ArchitectureDocument } from "./architechture";
import type { GraphNode, GraphEdge } from "./graph";
import type { BoundaryFinding, AttackPathFinding, IdentityFinding, EscalationFinding, ReportEntry } from "./findings";

export interface AnalysisResponse {
  architecture: ArchitectureDocument;
  summary: {
    node_count: number; edge_count: number;
    trust_boundaries: number; attack_paths: number;
    identity_findings: number; escalation_findings: number;
  };
  trust_boundaries: BoundaryFinding[];
  attack_paths: AttackPathFinding[];
  identity_findings: IdentityFinding[];
  escalation_findings: EscalationFinding[];
  report: ReportEntry[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
}
```

---

## 5. `constants/enums.ts`

```typescript
import type { TrustLevel, IdentityMechanism, AuthorizationModel } from "../types/architechture";

export const TRUST_LEVELS: TrustLevel[] = ["external", "internal", "privileged", "restricted"];
export const IDENTITY_MECHANISMS: IdentityMechanism[] = ["jwt", "mtls", "api_key", "service_account", "none"];
export const AUTHORIZATION_MODELS: AuthorizationModel[] = ["role_based", "attribute_based", "policy_based", "none"];
export const NODE_TYPE_SUGGESTIONS = [
  "api_gateway", "web_app", "auth_service", "microservice",
  "background_worker", "database", "cache", "queue",
  "message_broker", "control_plane_api", "orchestrator", "cluster_admin"
];
export const PROTOCOL_SUGGESTIONS = ["https", "grpc", "queue", "amqp", "kafka", "postgres", "mysql", "redis"];
```

---

## 6. `constants/nodelibrary.ts`

```typescript
import type { ArchitectureNode } from "../types/architechture";

export const NODE_LIBRARY: Array<{ key: string; label: string; node: ArchitectureNode }> = [
  {
    key: "gateway", label: "Gateway",
    node: { id: "gateway", label: "Gateway", type: "api_gateway", trust_level: "external", description: "Public ingress for external traffic.", auth: null, authorization: null, accepts_untrusted_input: true, exposes_public_endpoint: true, tags: ["edge", "public"] }
  },
  {
    key: "auth", label: "Auth",
    node: { id: "auth", label: "Auth", type: "auth_service", trust_level: "internal", description: "Issues and validates internal identity.", auth: "jwt", authorization: "role_based", accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["identity"] }
  },
  {
    key: "service", label: "Service",
    node: { id: "service", label: "Service", type: "microservice", trust_level: "internal", description: "Internal business logic service.", auth: "jwt", authorization: "role_based", accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["app"] }
  },
  {
    key: "worker", label: "Worker",
    node: { id: "worker", label: "Worker", type: "background_worker", trust_level: "privileged", description: "Background processor for queued jobs.", auth: "service_account", authorization: null, accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["async", "jobs"] }
  },
  {
    key: "database", label: "Database",
    node: { id: "database", label: "Database", type: "database", trust_level: "restricted", description: "Restricted data store.", auth: null, authorization: null, accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["data"] }
  },
  {
    key: "queue", label: "Queue",
    node: { id: "queue", label: "Queue", type: "queue", trust_level: "internal", description: "Asynchronous queue or broker topic.", auth: null, authorization: null, accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["messaging"] }
  },
  {
    key: "cache", label: "Cache",
    node: { id: "cache", label: "Cache", type: "cache", trust_level: "internal", description: "Internal cache layer.", auth: null, authorization: null, accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["performance"] }
  },
  {
    key: "control-plane", label: "Control Plane",
    node: { id: "control-plane", label: "Control Plane", type: "control_plane_api", trust_level: "privileged", description: "Privileged orchestration or control-plane endpoint.", auth: "mtls", authorization: "policy_based", accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["admin"] }
  }
];
```

---

## 7. `constants/sampleArchitechture.ts`

```typescript
import type { ArchitectureDocument } from "../types/architechture";

export const sampleArchitecture: ArchitectureDocument = {
  nodes: [
    { id: "gateway", type: "api_gateway", trust_level: "external", label: "Gateway", description: "Public ingress for customer requests.", auth: null, authorization: null, accepts_untrusted_input: true, exposes_public_endpoint: true, tags: ["edge", "public"] },
    { id: "auth", type: "auth_service", trust_level: "internal", label: "Auth", description: "Issues and validates JWTs.", auth: "jwt", authorization: "role_based", accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["identity"] },
    { id: "billing", type: "microservice", trust_level: "internal", label: "Billing", description: "Processes account billing changes.", auth: "jwt", authorization: "role_based", accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["payments"] },
    { id: "worker", type: "background_worker", trust_level: "privileged", label: "Worker", description: "Consumes jobs from the billing queue.", auth: "service_account", authorization: null, accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["async", "jobs"] },
    { id: "database", type: "database", trust_level: "restricted", label: "Database", description: "Primary restricted data store.", auth: null, authorization: null, accepts_untrusted_input: false, exposes_public_endpoint: false, tags: ["data"] }
  ],
  edges: [
    { from: "gateway", to: "auth", protocol: "https", label: "login", data_classification: "public", carries_identity: false, transforms_input: true, queue: false },
    { from: "auth", to: "billing", protocol: "https", label: "validated session", data_classification: "internal", carries_identity: true, transforms_input: false, queue: false },
    { from: "billing", to: "worker", protocol: "queue", label: "billing jobs", data_classification: "internal", carries_identity: false, transforms_input: false, queue: true },
    { from: "worker", to: "database", protocol: "postgres", label: "restricted writes", data_classification: "restricted", carries_identity: true, transforms_input: false, queue: false }
  ],
  metadata: { name: "Sample Billing Architecture" }
};
```

---

## 8. `api/analyze.ts`

```typescript
import type { ArchitectureDocument } from "../types/architechture";
import type { AnalysisResponse } from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function fetchSample(): Promise<{ document: string; format: string }> {
  const res = await fetch(`${API_BASE}/api/v1/sample`);
  if (!res.ok) throw new Error("Failed to fetch sample.");
  return res.json();
}

export async function analyzeArchitecture(body: {
  architecture?: ArchitectureDocument;
  document?: string;
  format?: string;
}): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json()) as { detail?: string };
    throw new Error(payload.detail ?? "Analysis failed.");
  }
  return res.json();
}
```

---

## 9. `utils/clone.ts`

```typescript
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
```

---

## 10. `utils/ids.ts`

```typescript
import type { ArchitectureDocument } from "../types/architechture";

export function createNodeId(arch: ArchitectureDocument): string {
  const used = new Set(arch.nodes.map((n) => n.id));
  let counter = arch.nodes.length + 1;
  while (used.has(`node-${counter}`)) counter++;
  return `node-${counter}`;
}

export function createNodeIdFromBase(arch: ArchitectureDocument, baseId: string): string {
  const used = new Set(arch.nodes.map((n) => n.id));
  if (!used.has(baseId)) return baseId;
  let counter = 2;
  while (used.has(`${baseId}-${counter}`)) counter += 1;
  return `${baseId}-${counter}`;
}

export function createLabelFromBase(baseLabel: string, nextId: string, baseId: string): string {
  if (nextId === baseId) return baseLabel;
  const suffix = nextId.slice(baseId.length + 1);
  return suffix ? `${baseLabel} ${suffix}` : baseLabel;
}
```

---

## 11. `utils/buildGraph.ts`

```typescript
import type { ArchitectureDocument } from "../types/architechture";
import type { GraphNode, GraphEdge } from "../types/graph";

export function buildGraph(
  arch: ArchitectureDocument,
  positions: Record<string, { x: number; y: number }>
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return {
    nodes: arch.nodes.map((n) => ({
      id: n.id,
      label: n.label?.trim() || n.id,
      type: n.type,
      trust_level: n.trust_level,
      position: positions[n.id],
      auth: n.auth ?? null,
      authorization: n.authorization ?? null,
      flags: [
        ...(n.exposes_public_endpoint ? ["public-entry"] : []),
        ...(n.accepts_untrusted_input ? ["untrusted-input"] : []),
      ],
    })),
    edges: arch.edges.map((e) => ({
      source: e.from,
      target: e.to,
      label: e.label?.trim() || e.protocol?.trim() || "",
      protocol: e.protocol ?? null,
      carries_identity: e.carries_identity,
      flags: [
        ...(e.queue ? ["queue-hop"] : []),
        ...(!e.carries_identity ? ["identity-risk"] : []),
        ...(e.transforms_input ? ["transforms-input"] : []),
      ],
    })),
  };
}
```

---

## Remaining files (hooks, components, styles) are in Part 2

This document covers **types, constants, api, and utils** — the foundation layer with zero React dependencies.

The next part will cover:
- `hooks/useSelection.ts`, `hooks/useArchitechture.ts`, `hooks/useAnalysis.ts`
- All 8 component files
- All 6 CSS files
- Fix for [main.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/main.tsx)
