import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import cytoscape, { type Core, type EventObject } from "cytoscape";
// @ts-expect-error — no bundled types for edgehandles
import edgehandles from "cytoscape-edgehandles";

import type { ArchitectureNode } from "../types/architecture";
import type { GraphEdge, GraphNode } from "../types/graph";

// Guard: only register the extension once (React Strict Mode runs module init twice)
if (!(cytoscape as any)._ehRegistered) {
  cytoscape.use(edgehandles);
  (cytoscape as any)._ehRegistered = true;
}

const trustColor: Record<string, string> = {
  external: "#d64545",
  internal: "#2f5fd0",
  privileged: "#df7b2d",
  restricted: "#101215",
};

function nodeShapeForType(type: string): cytoscape.Css.NodeShape {
  if (["database"].includes(type)) return "barrel";
  if (["background_worker"].includes(type)) return "hexagon";
  if (["auth_service"].includes(type)) return "diamond";
  if (["queue", "message_broker"].includes(type)) return "rhomboid";
  if (["control_plane_api", "orchestrator", "cluster_admin"].includes(type)) return "octagon";
  if (["cache"].includes(type)) return "ellipse";
  if (["api_gateway", "web_app"].includes(type)) return "round-rectangle";
  return "round-rectangle";
}

function buildFlags(node: GraphNode): string {
  return node.flags.join(" ");
}

export interface GraphCanvasHandle {
  addNodeAtCenter: (node: ArchitectureNode) => void;
  reLayout: () => void;
  cy: () => Core | null;
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void;
  onSelectNode?: (nodeId: string) => void;
  onSelectEdge?: (sourceId: string, targetId: string) => void;
  onDeselectAll?: () => void;
  onAddEdge?: (sourceId: string, targetId: string) => void;
  onDropOnBackground?: (sourceId: string, position: { x: number; y: number }) => void;
}

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { nodes, edges, onNodeMove, onSelectNode, onSelectEdge, onDeselectAll, onAddEdge, onDropOnBackground },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  const onSelectEdgeRef = useRef(onSelectEdge);
  const onDeselectAllRef = useRef(onDeselectAll);
  const onAddEdgeRef = useRef(onAddEdge);
  const onNodeMoveRef = useRef(onNodeMove);
  const onDropOnBackgroundRef = useRef(onDropOnBackground);
  onSelectNodeRef.current = onSelectNode;
  onSelectEdgeRef.current = onSelectEdge;
  onDeselectAllRef.current = onDeselectAll;
  onAddEdgeRef.current = onAddEdge;
  onNodeMoveRef.current = onNodeMove;
  onDropOnBackgroundRef.current = onDropOnBackground;

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const runLayout = useCallback(() => {
    cyRef.current?.layout({
      name: "breadthfirst", directed: true, padding: 30,
      spacingFactor: 1.35, animate: true, animationDuration: 350,
    }).run();
  }, []);

  useImperativeHandle(ref, () => ({
    addNodeAtCenter(node: ArchitectureNode) {
      const cy = cyRef.current;
      if (!cy) return;
      const ext = cy.extent();
      cy.add({
        data: {
          id: node.id, label: node.label || node.id, trust: node.trust_level, type: node.type,
          flags: [...(node.exposes_public_endpoint ? ["public-entry"] : []), ...(node.accepts_untrusted_input ? ["untrusted-input"] : [])].join(" "),
        },
        position: { x: ext.x1 + ext.w / 2 + (Math.random() - 0.5) * 120, y: ext.y1 + ext.h / 2 + (Math.random() - 0.5) * 120 },
      });
    },
    reLayout: runLayout,
    cy: () => cyRef.current,
  }), [runLayout]);

  // Create Cytoscape ONCE on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const initNodes = nodesRef.current;
    const initEdges = edgesRef.current;

    const instance = cytoscape({
      container: containerRef.current,
      elements: [
        ...initNodes.map((node) => ({
          data: { id: node.id, label: node.label, trust: node.trust_level, type: node.type, flags: buildFlags(node) },
          ...(node.position ? { position: node.position } : {}),
        })),
        ...initEdges.map((edge) => ({
          data: { id: `${edge.source}->${edge.target}`, source: edge.source, target: edge.target, label: edge.label, flags: edge.flags.join(" ") },
        })),
      ],
      layout: initNodes.every((n) => n.position)
        ? { name: "preset", fit: true, padding: 30 }
        : { name: "breadthfirst", directed: true, padding: 30, spacingFactor: 1.35 },
      style: [
        {
          selector: "node", style: {
            shape: (el) => nodeShapeForType(String(el.data("type"))),
            label: "data(label)", color: "#f6f7fb", "font-size": 12, "font-weight": 700,
            "text-valign": "center", "text-halign": "center", "text-wrap": "wrap", "text-max-width": "84",
            "background-color": (el) => trustColor[el.data("trust")] ?? "#5a657a",
            "border-width": 3, "border-color": "#edf1ff", width: 72, height: 72, "overlay-opacity": 0,
          }
        },
        { selector: "node:selected", style: { "border-width": 5, "border-color": "#6de0c5", "overlay-color": "#6de0c5", "overlay-opacity": 0.12 } },
        { selector: 'node[flags *= "public-entry"]', style: { "border-color": "#8bf0da", "border-width": 5 } },
        { selector: 'node[flags *= "untrusted-input"]', style: { "overlay-color": "#7ce7ff", "overlay-opacity": 0.14 } },
        { selector: 'node[flags *= "attack-path"]', style: { "border-color": "#ffe680", "border-width": 5 } },
        { selector: 'node[flags *= "escalation"]', style: { "overlay-color": "#ff7a3d", "overlay-opacity": 0.16 } },
        { selector: ".eh-handle", style: { "background-color": "#6de0c5", width: 18, height: 18, shape: "ellipse", "overlay-opacity": 0, "border-width": 3, "border-color": "#fff" } },
        { selector: ".eh-ghost-edge", style: { "line-color": "#6de0c5", "target-arrow-color": "#6de0c5", "line-style": "dashed", opacity: 0.6 } },
        {
          selector: "edge", style: {
            width: 3, "curve-style": "bezier", "target-arrow-shape": "triangle",
            "line-color": "#94a1c4", "target-arrow-color": "#94a1c4",
            label: "data(label)", color: "#d6dcf2", "font-size": 10,
            "text-background-color": "#111724", "text-background-opacity": 0.78, "text-background-padding": "3", "arrow-scale": 1.1,
          }
        },
        { selector: "edge:selected", style: { width: 5, "line-color": "#6de0c5", "target-arrow-color": "#6de0c5" } },
        { selector: 'edge[flags *= "queue-hop"]', style: { "line-style": "dashed", width: 4, "line-color": "#82cfff", "target-arrow-color": "#82cfff" } },
        { selector: 'edge[flags *= "trust-boundary"]', style: { width: 4, "line-style": "dashed", "line-color": "#6de0c5", "target-arrow-color": "#6de0c5" } },
        { selector: 'edge[flags *= "attack-path"]', style: { width: 5, "line-color": "#ffe680", "target-arrow-color": "#ffe680" } },
        { selector: 'edge[flags *= "identity-risk"]', style: { "line-color": "#ff6d8a", "target-arrow-color": "#ff6d8a" } },
        { selector: 'edge[flags *= "transforms-input"]', style: { "line-style": "dotted" } },
      ],
      autoungrabify: false, userPanningEnabled: true, userZoomingEnabled: true, boxSelectionEnabled: false,
    });

    cyRef.current = instance;
    instance.on("tap", "node", (event: EventObject) => { onSelectNodeRef.current?.(event.target.id()); });
    instance.on("tap", "edge", (event: EventObject) => { const d = event.target.data(); onSelectEdgeRef.current?.(d.source, d.target); });
    instance.on("tap", (event: EventObject) => { if (event.target === instance) onDeselectAllRef.current?.(); });
    instance.on("dragfree", "node", (event: EventObject) => {
      const draggedNode = event.target;
      const pos = draggedNode.position();
      onNodeMoveRef.current?.(draggedNode.id(), { x: pos.x, y: pos.y });

      // Proximity auto-connect: if this node has zero edges, snap to nearest node
      const connectedEdges = draggedNode.connectedEdges().filter((e: any) => !e.hasClass("eh-ghost-edge"));
      if (connectedEdges.length === 0) {
        const PROXIMITY_THRESHOLD = 120;
        let nearest: { id: string; dist: number } | null = null;
        instance.nodes().forEach((other) => {
          if (other.id() === draggedNode.id() || other.hasClass("eh-handle")) return;
          const otherPos = other.position();
          const dist = Math.sqrt((pos.x - otherPos.x) ** 2 + (pos.y - otherPos.y) ** 2);
          if (dist < PROXIMITY_THRESHOLD && (!nearest || dist < nearest.dist)) {
            nearest = { id: other.id(), dist };
          }
        });
        if (nearest) {
          onAddEdgeRef.current?.((nearest as { id: string; dist: number }).id, draggedNode.id());
        }
      }
    });

    const eh = (instance as any).edgehandles({
      snap: true, noEdgeEventsInDraw: true,
      handlePosition: () => "bottom center",
      handleSize: 18,
      hoverDelay: 0,
      canConnect: (s: any, t: any) => s.id() !== t.id(),
      edgeParams: () => ({ data: { label: "" } }),
      complete: (s: any, t: any, added: any) => { added.remove(); onAddEdgeRef.current?.(s.id(), t.id()); },
      cancel: (sourceNode: any, cancelledUserInputEvents: any) => {
        if (cancelledUserInputEvents && cancelledUserInputEvents.position) {
          onDropOnBackgroundRef.current?.(sourceNode.id(), cancelledUserInputEvents.position);
        }
      }
    });

    return () => { eh.destroy(); instance.destroy(); cyRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Incremental sync
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const currentNodeIds = new Set(nodes.map((n) => n.id));
    const currentEdgeKeys = new Set(edges.map((e) => `${e.source}->${e.target}`));
    const cyNodeIds = new Set(cy.nodes().map((n) => n.id()));
    const cyEdgeIds = new Set(cy.edges().filter((e) => !e.hasClass("eh-ghost-edge")).map((e) => e.id()));

    for (const node of nodes) {
      if (!cyNodeIds.has(node.id)) {
        cy.add({ data: { id: node.id, label: node.label, trust: node.trust_level, type: node.type, flags: buildFlags(node) }, ...(node.position ? { position: node.position } : {}) });
      }
    }
    for (const cyNodeId of cyNodeIds) { if (!currentNodeIds.has(cyNodeId)) cy.getElementById(cyNodeId).remove(); }
    for (const node of nodes) {
      const cyNode = cy.getElementById(node.id);
      if (cyNode.length) { cyNode.data("label", node.label); cyNode.data("trust", node.trust_level); cyNode.data("type", node.type); cyNode.data("flags", buildFlags(node)); }
    }
    for (const edge of edges) {
      const edgeId = `${edge.source}->${edge.target}`;
      if (!cyEdgeIds.has(edgeId) && cy.getElementById(edge.source).length && cy.getElementById(edge.target).length) {
        cy.add({ data: { id: edgeId, source: edge.source, target: edge.target, label: edge.label, flags: edge.flags.join(" ") } });
      }
    }
    for (const cyEdgeId of cyEdgeIds) { if (!currentEdgeKeys.has(cyEdgeId)) cy.getElementById(cyEdgeId).remove(); }
    for (const edge of edges) {
      const edgeId = `${edge.source}->${edge.target}`;
      const cyEdge = cy.getElementById(edgeId);
      if (cyEdge.length) { cyEdge.data("label", edge.label); cyEdge.data("flags", edge.flags.join(" ")); }
    }
  }, [nodes, edges]);

  return <div className="graph-canvas" ref={containerRef} />;
});

export default GraphCanvas;