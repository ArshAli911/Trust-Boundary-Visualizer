import type { ArchitectureDocument } from "../types/architecture";
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