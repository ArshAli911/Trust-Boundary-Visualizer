import type { ArchitectureNode } from "../types/architecture";

export const NODE_LIBRARY: Array<{ key: string; label: string; node: ArchitectureNode }> = [
  {
    key: "gateway", label: "Gateway",
    node: { id: "gateway", label: "Gateway", type: "api gateway", trust_level: "external", description: "Public ingress for external traffic.", auth: null, authorization: null, accepts_untrusted_input: true, exposes_public_endpoint: true, tags: ["edge", "public"] }
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
