import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";

import type { GraphEdge, GraphNode } from "./types";

const trustColor: Record<string, string> = {
  external: "#d64545",
  internal: "#2f5fd0",
  privileged: "#df7b2d",
  restricted: "#101215"
};

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function GraphCanvas({ nodes, edges }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const instance = cytoscape({
      container: containerRef.current,
      elements: [
        ...nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.label,
            trust: node.trust_level,
            type: node.type,
            flags: node.flags.join(" ")
          }
        })),
        ...edges.map((edge) => ({
          data: {
            id: `${edge.source}->${edge.target}`,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            flags: edge.flags.join(" ")
          }
        }))
      ],
      layout: {
        name: "breadthfirst",
        directed: true,
        padding: 18,
        spacingFactor: 1.2
      },
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            color: "#f6f7fb",
            "font-size": 12,
            "font-weight": 600,
            "text-valign": "center",
            "text-halign": "center",
            "background-color": (element) => trustColor[element.data("trust")] ?? "#5a657a",
            "border-width": 2,
            "border-color": "#edf1ff",
            width: 60,
            height: 60,
            "text-wrap": "wrap",
            "text-max-width": "72"
          }
        },
        {
          selector: 'node[flags *= "attack-path"]',
          style: {
            "border-width": 4,
            "border-color": "#ffe680"
          }
        },
        {
          selector: 'node[flags *= "escalation"]',
          style: {
            "overlay-color": "#ff7a3d",
            "overlay-opacity": 0.12
          }
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "line-color": "#94a1c4",
            "target-arrow-color": "#94a1c4",
            label: "data(label)",
            color: "#d6dcf2",
            "font-size": 10,
            "text-background-color": "#111724",
            "text-background-opacity": 0.75,
            "text-background-padding": "2"
          }
        },
        {
          selector: 'edge[flags *= "trust-boundary"]',
          style: {
            width: 4,
            "line-style": "dashed",
            "line-color": "#6de0c5",
            "target-arrow-color": "#6de0c5"
          }
        },
        {
          selector: 'edge[flags *= "attack-path"]',
          style: {
            width: 5,
            "line-color": "#ffe680",
            "target-arrow-color": "#ffe680"
          }
        },
        {
          selector: 'edge[flags *= "identity-risk"]',
          style: {
            "line-color": "#ff6d8a",
            "target-arrow-color": "#ff6d8a"
          }
        }
      ]
    });

    return () => {
      instance.destroy();
    };
  }, [edges, nodes]);

  return <div className="graph-canvas" ref={containerRef} />;
}
