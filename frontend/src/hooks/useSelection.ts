import { useState } from "react";

export function useSelection() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<{ from: string; to: string } | null>(null);

  function selectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    setSelectedEdgeKey(null);
  }

  function selectEdge(source: string, target: string) {
    setSelectedEdgeKey({ from: source, to: target });
    setSelectedNodeId(null);
  }

  function deselectAll() {
    setSelectedNodeId(null);
    setSelectedEdgeKey(null);
  }

  return { selectedNodeId, setSelectedNodeId, selectedEdgeKey, setSelectedEdgeKey, selectNode, selectEdge, deselectAll };
}