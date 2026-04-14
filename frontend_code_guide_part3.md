# Frontend Code Guide — Part 3: GraphToolbar, GraphCanvas, App, CSS, main.tsx

---

## 21. `components/GraphToolbar.tsx`

```tsx
import { useState } from "react";
import ImportModal from "./ImportModal";

interface GraphToolbarProps {
  nodeLibrary: Array<{ key: string; label: string }>;
  nodeIds: string[];
  nodeCount: number;
  edgeCount: number;
  loading: boolean;
  onAddNode: (templateKey: string) => void;
  onAddEdge: (sourceId: string, targetId: string) => void;
  onAnalyze: () => void;
  onLoadSample: () => void;
  onResetLayout: () => void;
  onImport: (text: string, format: "yaml" | "json" | "auto") => void;
}

export default function GraphToolbar({
  nodeLibrary, nodeIds, nodeCount, edgeCount, loading,
  onAddNode, onAddEdge, onAnalyze, onLoadSample, onResetLayout, onImport,
}: GraphToolbarProps) {
  const [showImport, setShowImport] = useState(false);
  const [nextNodeType, setNextNodeType] = useState(nodeLibrary[0]?.key ?? "");
  const [edgeSource, setEdgeSource] = useState("");
  const [edgeTarget, setEdgeTarget] = useState("");

  function handleAddEdgeSubmit() {
    if (!edgeSource || !edgeTarget) return;
    onAddEdge(edgeSource, edgeTarget);
    setEdgeSource("");
    setEdgeTarget("");
  }

  return (
    <>
      <div className="graph-toolbar-bar">
        <div className="toolbar-left">
          <button className="toolbar-btn primary" type="button" onClick={onAnalyze} disabled={loading || nodeCount === 0}>
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          <div className="toolbar-select-group">
            <select value={nextNodeType} onChange={(e) => setNextNodeType(e.target.value)}>
              {nodeLibrary.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
            </select>
            <button className="toolbar-btn" type="button" onClick={() => onAddNode(nextNodeType)} disabled={!nextNodeType}>
              + Built-in Node
            </button>
          </div>
          <button className="toolbar-btn" type="button" onClick={() => setShowImport(!showImport)}>Import</button>
          <button className="toolbar-btn" type="button" onClick={onLoadSample}>Sample</button>
          <button className="toolbar-btn" type="button" onClick={onResetLayout} disabled={nodeCount === 0}>Layout</button>
        </div>
        <div className="toolbar-right">
          <span className="toolbar-badge">{nodeCount} nodes</span>
          <span className="toolbar-badge">{edgeCount} edges</span>
        </div>
      </div>

      <div className="edge-builder">
        <div className="toolbar-select-group">
          <select value={edgeSource} onChange={(e) => setEdgeSource(e.target.value)}>
            <option value="">From node</option>
            {nodeIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          <select value={edgeTarget} onChange={(e) => setEdgeTarget(e.target.value)}>
            <option value="">To node</option>
            {nodeIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          <button className="toolbar-btn" type="button" onClick={handleAddEdgeSubmit}
            disabled={!edgeSource || !edgeTarget || edgeSource === edgeTarget}>
            Add Edge
          </button>
        </div>
      </div>

      {showImport && (
        <ImportModal onImport={onImport} onClose={() => setShowImport(false)} />
      )}
    </>
  );
}
```

---

## 22. `components/GraphCanvas.tsx` — *this is the Cytoscape file, keep it as-is*

> [!IMPORTANT]
> This file is the Cytoscape renderer. It's the same logic from the old [GraphCanvas.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/GraphCanvas.tsx), just with updated import paths.

```tsx
import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import cytoscape, { type Core, type EventObject } from "cytoscape";
// @ts-expect-error — no bundled types for edgehandles
import edgehandles from "cytoscape-edgehandles";

import type { ArchitectureNode } from "../types/architecture";
import type { GraphEdge, GraphNode } from "../types/graph";

cytoscape.use(edgehandles);

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
}

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { nodes, edges, onNodeMove, onSelectNode, onSelectEdge, onDeselectAll, onAddEdge },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  const onSelectEdgeRef = useRef(onSelectEdge);
  const onDeselectAllRef = useRef(onDeselectAll);
  const onAddEdgeRef = useRef(onAddEdge);
  const onNodeMoveRef = useRef(onNodeMove);
  onSelectNodeRef.current = onSelectNode;
  onSelectEdgeRef.current = onSelectEdge;
  onDeselectAllRef.current = onDeselectAll;
  onAddEdgeRef.current = onAddEdge;
  onNodeMoveRef.current = onNodeMove;

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
        { selector: "node", style: {
          shape: (el) => nodeShapeForType(String(el.data("type"))),
          label: "data(label)", color: "#f6f7fb", "font-size": 12, "font-weight": 700,
          "text-valign": "center", "text-halign": "center", "text-wrap": "wrap", "text-max-width": "84",
          "background-color": (el) => trustColor[el.data("trust")] ?? "#5a657a",
          "border-width": 3, "border-color": "#edf1ff", width: 72, height: 72, "overlay-opacity": 0,
        }},
        { selector: "node:selected", style: { "border-width": 5, "border-color": "#6de0c5", "overlay-color": "#6de0c5", "overlay-opacity": 0.12 }},
        { selector: 'node[flags *= "public-entry"]', style: { "border-color": "#8bf0da", "border-width": 5 }},
        { selector: 'node[flags *= "untrusted-input"]', style: { "overlay-color": "#7ce7ff", "overlay-opacity": 0.14 }},
        { selector: 'node[flags *= "attack-path"]', style: { "border-color": "#ffe680", "border-width": 5 }},
        { selector: 'node[flags *= "escalation"]', style: { "overlay-color": "#ff7a3d", "overlay-opacity": 0.16 }},
        { selector: ".eh-handle", style: { "background-color": "#6de0c5", width: 14, height: 14, shape: "ellipse", "overlay-opacity": 0, "border-width": 2, "border-color": "#fff" }},
        { selector: ".eh-ghost-edge", style: { "line-color": "#6de0c5", "target-arrow-color": "#6de0c5", "line-style": "dashed", opacity: 0.6 }},
        { selector: "edge", style: {
          width: 3, "curve-style": "bezier", "target-arrow-shape": "triangle",
          "line-color": "#94a1c4", "target-arrow-color": "#94a1c4",
          label: "data(label)", color: "#d6dcf2", "font-size": 10,
          "text-background-color": "#111724", "text-background-opacity": 0.78, "text-background-padding": "3", "arrow-scale": 1.1,
        }},
        { selector: "edge:selected", style: { width: 5, "line-color": "#6de0c5", "target-arrow-color": "#6de0c5" }},
        { selector: 'edge[flags *= "queue-hop"]', style: { "line-style": "dashed", width: 4, "line-color": "#82cfff", "target-arrow-color": "#82cfff" }},
        { selector: 'edge[flags *= "trust-boundary"]', style: { width: 4, "line-style": "dashed", "line-color": "#6de0c5", "target-arrow-color": "#6de0c5" }},
        { selector: 'edge[flags *= "attack-path"]', style: { width: 5, "line-color": "#ffe680", "target-arrow-color": "#ffe680" }},
        { selector: 'edge[flags *= "identity-risk"]', style: { "line-color": "#ff6d8a", "target-arrow-color": "#ff6d8a" }},
        { selector: 'edge[flags *= "transforms-input"]', style: { "line-style": "dotted" }},
      ],
      autoungrabify: false, userPanningEnabled: true, userZoomingEnabled: true, boxSelectionEnabled: false,
    });

    cyRef.current = instance;
    instance.on("tap", "node", (event: EventObject) => { onSelectNodeRef.current?.(event.target.id()); });
    instance.on("tap", "edge", (event: EventObject) => { const d = event.target.data(); onSelectEdgeRef.current?.(d.source, d.target); });
    instance.on("tap", (event: EventObject) => { if (event.target === instance) onDeselectAllRef.current?.(); });
    instance.on("dragfree", "node", (event: EventObject) => {
      const pos = event.target.position();
      onNodeMoveRef.current?.(event.target.id(), { x: pos.x, y: pos.y });
    });

    const eh = (instance as any).edgehandles({
      snap: true, noEdgeEventsInDraw: true,
      canConnect: (s: any, t: any) => s.id() !== t.id(),
      edgeParams: () => ({ data: { label: "" } }),
      complete: (s: any, t: any, added: any) => { added.remove(); onAddEdgeRef.current?.(s.id(), t.id()); },
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
```

---

## 23. `components/App.tsx` — *the shell*

```tsx
import { useMemo, useRef, startTransition } from "react";
import GraphCanvas, { type GraphCanvasHandle } from "./GraphCanvas";
import GraphToolbar from "./GraphToolbar";
import NodeEditor from "./NodeEditor";
import EdgeEditor from "./EdgeEditor";
import FindingsPanel from "./FindingsPanel";
import { useArchitecture } from "../hooks/useArchitecture";
import { useSelection } from "../hooks/useSelection";
import { useAnalysis } from "../hooks/useAnalysis";
import { buildGraph } from "../utils/buildGraph";
import { NODE_LIBRARY } from "../constants/nodelibrary";
import { clone } from "../utils/clone";

export default function App() {
  const arch = useArchitecture();
  const sel = useSelection();
  const api = useAnalysis();
  const graphRef = useRef<GraphCanvasHandle>(null);

  const displayGraph = useMemo(
    () => buildGraph(arch.architecture, arch.nodePositions),
    [arch.architecture, arch.nodePositions]
  );

  // --- Toolbar handlers ---
  function handleAddNode(templateKey: string) {
    const ext = graphRef.current?.cy()?.extent();
    const nextId = arch.addNode(templateKey, ext);
    if (nextId) setTimeout(() => sel.selectNode(nextId), 50);
  }

  function handleAddEdge(sourceId: string, targetId: string) {
    arch.addEdge(sourceId, targetId);
    sel.selectEdge(sourceId, targetId);
  }

  function handleLoadSample() {
    arch.loadSample();
    sel.deselectAll();
    api.setError(null);
  }

  function handleImport(text: string, format: "yaml" | "json" | "auto") {
    api.importDocument(text, format).then((payload) => {
      if (payload) {
        startTransition(() => {
          arch.loadFromAnalysis(payload.architecture);
          sel.deselectAll();
        });
      }
    });
  }

  async function handleAnalyze() {
    const payload = await api.analyze(arch.architecture);
    if (payload) {
      startTransition(() => {
        arch.loadFromAnalysis(payload.architecture);
        arch.setLayoutVersion((v) => v + 1);
      });
    }
  }

  function handleResetLayout() { graphRef.current?.reLayout(); }

  // --- Node / Edge mutation wrappers ---
  function updateNode(updated: import("../types/architecture").ArchitectureNode) {
    const newId = arch.updateNode(updated, sel.selectedNodeId!);
    if (newId !== sel.selectedNodeId) sel.setSelectedNodeId(newId);
  }

  function deleteNode(nodeId: string) {
    arch.deleteNode(nodeId);
    sel.deselectAll();
  }

  function updateEdge(updated: import("../types/architecture").ArchitectureEdge) {
    if (!sel.selectedEdgeKey) return;
    arch.updateEdge(updated, sel.selectedEdgeKey);
    sel.setSelectedEdgeKey({ from: updated.from, to: updated.to });
  }

  function deleteEdge() {
    if (!sel.selectedEdgeKey) return;
    arch.deleteEdge(sel.selectedEdgeKey);
    sel.deselectAll();
  }

  // --- Resolved selections ---
  const selectedNode = sel.selectedNodeId
    ? arch.architecture.nodes.find((n) => n.id === sel.selectedNodeId) ?? null : null;
  const selectedEdge = sel.selectedEdgeKey
    ? arch.architecture.edges.find((e) => e.from === sel.selectedEdgeKey!.from && e.to === sel.selectedEdgeKey!.to) ?? null : null;

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Security Architecture Analysis Tool</p>
          <h1>Trust Boundary Visualizer</h1>
        </div>
        <p className="hero-copy">
          Build your topology visually from built-in components, connect nodes with explicit edge controls,
          then analyze to detect trust transitions, attack chains, and privilege escalation patterns.
        </p>
      </header>

      <main className="workspace">
        <section className="panel graph-panel">
          <div className="panel-heading">
            <h2>Architecture Graph</h2>
            <div className="legend">
              <span className="legend-chip external">External</span>
              <span className="legend-chip internal">Internal</span>
              <span className="legend-chip privileged">Privileged</span>
              <span className="legend-chip restricted">Restricted</span>
              <span className="legend-chip detail">Use built-in nodes and Add Edge controls</span>
            </div>
          </div>

          <GraphToolbar
            nodeLibrary={NODE_LIBRARY.map((e) => ({ key: e.key, label: e.label }))}
            nodeIds={arch.architecture.nodes.map((n) => n.id)}
            nodeCount={arch.architecture.nodes.length}
            edgeCount={arch.architecture.edges.length}
            loading={api.loading}
            onAddNode={handleAddNode}
            onAddEdge={handleAddEdge}
            onAnalyze={handleAnalyze}
            onLoadSample={handleLoadSample}
            onResetLayout={handleResetLayout}
            onImport={handleImport}
          />

          {api.error && <p className="error-banner">{api.error}</p>}

          <div className="graph-workspace">
            <GraphCanvas
              key={arch.layoutVersion}
              ref={graphRef}
              nodes={displayGraph.nodes}
              edges={displayGraph.edges}
              onNodeMove={arch.handleNodeMove}
              onSelectNode={sel.selectNode}
              onSelectEdge={sel.selectEdge}
              onDeselectAll={sel.deselectAll}
              onAddEdge={handleAddEdge}
            />
            {selectedNode && <NodeEditor node={selectedNode} onUpdate={updateNode} onDelete={deleteNode} onClose={sel.deselectAll} />}
            {selectedEdge && <EdgeEditor edge={selectedEdge} nodeIds={arch.architecture.nodes.map((n) => n.id)} onUpdate={updateEdge} onDelete={deleteEdge} onClose={sel.deselectAll} />}
          </div>
        </section>

        <FindingsPanel analysis={api.analysis} />
      </main>
    </div>
  );
}
```

---

## 24. [main.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/main.tsx) — **fix the broken import**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App";
import "./style/index.css";
import "./style/toolbar.css";
import "./style/canvas.css";
import "./style/inspector.css";
import "./style/finding.css";
import "./style/modal.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## CSS Files

### 25. `style/index.css`

```css
:root {
  font-family: Aptos, "Segoe UI", "Helvetica Neue", sans-serif;
  color: #f4f7ff;
  background:
    radial-gradient(circle at top left, rgba(34, 92, 179, 0.38), transparent 26%),
    radial-gradient(circle at top right, rgba(225, 119, 46, 0.28), transparent 22%),
    linear-gradient(180deg, #09101c 0%, #10192a 44%, #0f1725 100%);
  line-height: 1.5;
  font-weight: 400;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; }
button, input, textarea, select { font: inherit; }
#root { min-height: 100vh; }
.app-shell { width: min(1440px, calc(100vw - 32px)); margin: 0 auto; padding: 28px 0 36px; }

/* Hero */
.hero { display: grid; gap: 16px; align-items: end; margin-bottom: 24px; }
.hero h1 { margin: 0; font-size: clamp(2.2rem, 5vw, 4.4rem); line-height: 0.94; letter-spacing: -0.04em; }
.eyebrow { margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.74rem; color: #94e6d4; }
.hero-copy { max-width: 860px; margin: 0; color: #c8d3f0; }

/* Workspace & Panel */
.workspace { display: grid; gap: 20px; }
.panel { border: 1px solid rgba(207, 219, 255, 0.12); background: rgba(12, 19, 32, 0.8); border-radius: 24px; box-shadow: 0 20px 60px rgba(2, 6, 16, 0.32); backdrop-filter: blur(12px); }
.graph-panel { padding: 20px; min-height: 720px; display: flex; flex-direction: column; }
.findings-panel { padding: 20px; min-width: 0; }
.panel-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.panel-heading h2, .findings-section h3 { margin: 0; }

/* Fields */
.field-label { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: #adbbdf; display: inline-block; margin-bottom: 8px; }
input:not([type="checkbox"]), textarea, select { border: 1px solid rgba(185, 198, 231, 0.18); background: rgba(7, 11, 20, 0.7); color: #eff3ff; border-radius: 16px; }
input:not([type="checkbox"]) { padding: 12px 14px; width: 100%; }
select { padding: 12px 14px; width: 100%; }

/* Buttons */
.primary-button { border: none; border-radius: 16px; background: linear-gradient(90deg, #6de0c5 0%, #2f5fd0 100%); color: #06101c; padding: 14px 18px; font-weight: 700; cursor: pointer; }
.secondary-button { border: 1px solid rgba(157, 175, 220, 0.22); border-radius: 16px; background: rgba(255, 255, 255, 0.04); color: #e7eeff; padding: 14px 18px; font-weight: 600; cursor: pointer; }
.danger-button { border: 1px solid rgba(255, 128, 146, 0.22); border-radius: 12px; background: rgba(255, 109, 138, 0.08); color: #ffc2cd; padding: 9px 12px; font-weight: 600; cursor: pointer; }
.primary-button:disabled, .secondary-button:disabled, .danger-button:disabled { opacity: 0.7; cursor: not-allowed; }

/* Banners */
.error-banner, .empty-state, .empty-list { border-radius: 16px; padding: 14px 16px; background: rgba(255, 109, 138, 0.08); color: #ffb9c6; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

/* Legend */
.legend { display: flex; flex-wrap: wrap; gap: 8px; }
.legend-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; font-size: 0.78rem; border: 1px solid rgba(255, 255, 255, 0.1); }
.legend-chip.external { background: rgba(214, 69, 69, 0.16); }
.legend-chip.internal { background: rgba(47, 95, 208, 0.16); }
.legend-chip.privileged { background: rgba(223, 123, 45, 0.16); }
.legend-chip.restricted { background: rgba(16, 18, 21, 0.6); }
.legend-chip.detail { background: rgba(255, 255, 255, 0.04); color: #cfd8f5; }

/* Responsive */
@media (max-width: 680px) {
  .app-shell { width: min(100vw - 20px, 1440px); padding-top: 20px; }
  .panel-heading, .finding-header, .graph-toolbar-bar, .toolbar-select-group { flex-direction: column; align-items: flex-start; }
  .editor-grid { grid-template-columns: 1fr; }
  .graph-canvas { min-height: 440px; }
  .graph-workspace { min-height: 440px; }
  .inspector-panel { width: 100%; position: fixed; bottom: 0; left: 0; right: 0; top: auto; max-height: 60vh; border-radius: 18px 18px 0 0; animation: slideUp 0.22s ease-out; }
}
```

### 26. `style/toolbar.css`

```css
.graph-toolbar-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; padding: 10px 14px; border-radius: 18px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); }
.toolbar-left, .toolbar-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.toolbar-btn { border: 1px solid rgba(157, 175, 220, 0.18); border-radius: 12px; background: rgba(255, 255, 255, 0.05); color: #e0e8ff; padding: 8px 14px; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.toolbar-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); border-color: rgba(157, 175, 220, 0.35); }
.toolbar-btn.primary { background: linear-gradient(90deg, #6de0c5 0%, #2f5fd0 100%); color: #06101c; border-color: transparent; font-weight: 700; }
.toolbar-btn.primary:hover:not(:disabled) { opacity: 0.9; }
.toolbar-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.toolbar-badge { padding: 6px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); color: #cfd8f5; font-size: 0.82rem; }
.toolbar-select-group { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.toolbar-select-group select { min-width: 150px; padding: 8px 12px; border-radius: 12px; }
.edge-builder { margin-bottom: 12px; padding: 10px 14px; border-radius: 18px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); }
```

### 27. `style/canvas.css`

```css
.graph-workspace { flex: 1; display: flex; position: relative; min-height: 620px; gap: 0; }
.graph-canvas { flex: 1; min-height: 620px; border-radius: 18px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)), rgba(8, 12, 21, 0.9); border: 1px solid rgba(255, 255, 255, 0.05); }
```

### 28. `style/inspector.css`

```css
.inspector-panel { position: absolute; top: 0; right: 0; width: 340px; max-height: 100%; overflow-y: auto; z-index: 20; border-radius: 18px; border: 1px solid rgba(109, 224, 197, 0.22); background: rgba(12, 19, 32, 0.95); backdrop-filter: blur(16px); box-shadow: -8px 0 40px rgba(2, 6, 16, 0.5); animation: slideInRight 0.22s ease-out; }
@keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
.inspector-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.inspector-header h3 { margin: 0; font-size: 1rem; }
.inspector-close { border: none; background: rgba(255, 255, 255, 0.06); color: #cfd8f5; width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1rem; transition: background 0.15s; }
.inspector-close:hover { background: rgba(255, 255, 255, 0.12); }
.inspector-body { padding: 16px 18px 20px; }
.inspector-actions { margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.06); }
.editor-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.editor-grid label { display: grid; min-width: 0; }
.editor-grid .field-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.editor-span { grid-column: 1 / -1; }
.mini-textarea { min-height: 90px; resize: vertical; padding: 12px 14px; font-family: Consolas, "SFMono-Regular", monospace; font-size: 0.88rem; width: 100%; }
.checkbox-row { display: flex; gap: 10px; flex-wrap: wrap; }
.check-pill { display: inline-flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); color: #d2dbf4; }
.check-pill input { accent-color: #6de0c5; }
```

### 29. `style/finding.css`

```css
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
.summary-card { display: flex; justify-content: space-between; align-items: baseline; padding: 16px; border-radius: 18px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); }
.summary-card span { color: #bcc8e7; }
.summary-card strong { font-size: 1.5rem; }
.findings-section { margin-top: 20px; }
.finding-list { display: grid; gap: 12px; margin-top: 12px; }
.finding-card { padding: 16px; border-radius: 18px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); }
.finding-card p { margin: 10px 0 0; color: #d2dbf4; }
.finding-header { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.severity { padding: 4px 10px; border-radius: 999px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
.severity-critical { background: rgba(255, 109, 138, 0.18); color: #ffb7c4; }
.severity-high { background: rgba(255, 152, 97, 0.18); color: #ffcfb2; }
.severity-medium { background: rgba(255, 230, 128, 0.18); color: #ffe680; }
.severity-low, .severity-report { background: rgba(109, 224, 197, 0.16); color: #9cefdc; }
.recommendation { color: #9cefdc; }
```

### 30. `style/modal.css`

```css
.import-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(4, 8, 16, 0.65); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.15s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.import-modal { width: min(560px, calc(100vw - 40px)); border-radius: 24px; border: 1px solid rgba(109, 224, 197, 0.18); background: rgba(12, 19, 32, 0.96); backdrop-filter: blur(16px); box-shadow: 0 20px 60px rgba(2, 6, 16, 0.5); animation: slideUp 0.2s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.import-hint { margin: 0; padding: 0 18px; color: #b7c4e7; font-size: 0.88rem; }
.import-textarea { width: calc(100% - 36px); margin: 10px 18px 14px; min-height: 220px; resize: vertical; padding: 14px; font-family: Consolas, "SFMono-Regular", monospace; font-size: 0.88rem; border-radius: 14px; }
.import-actions { display: flex; gap: 10px; padding: 0 18px 18px; flex-wrap: wrap; }
.import-file-btn { cursor: pointer; display: inline-flex; align-items: center; }
```

---

That's all 30 files. You're done!
