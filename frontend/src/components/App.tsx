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