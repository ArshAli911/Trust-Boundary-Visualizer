import { useState } from "react";
import type { ArchitectureDocument, ArchitectureNode, ArchitectureEdge } from "../types/architecture";
import { clone } from "../utils/clone";
import { createNodeIdFromBase, createLabelFromBase } from "../utils/ids";
import { NODE_LIBRARY } from "../constants/nodelibrary";
import { sampleArchitecture } from "../constants/sampleArchitecture";

export function useArchitecture() {
  const [architecture, setArchitecture] = useState<ArchitectureDocument>(() => clone(sampleArchitecture));
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [layoutVersion, setLayoutVersion] = useState(0);

  function handleNodeMove(nodeId: string, position: { x: number; y: number }) {
    setNodePositions((prev) => ({ ...prev, [nodeId]: position }));
  }

  function updateNode(updated: ArchitectureNode, previousId: string) {
    const safeId = updated.id.trim() || previousId;
    const safe = { ...updated, id: safeId };
    setArchitecture((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === previousId ? safe : n)),
      edges: safe.id !== previousId
        ? prev.edges.map((e) => ({
            ...e,
            from: e.from === previousId ? safe.id : e.from,
            to: e.to === previousId ? safe.id : e.to,
          }))
        : prev.edges,
    }));
    if (safe.id !== previousId) {
      setNodePositions((prev) => {
        const next = { ...prev };
        if (previousId in next) {
          next[safe.id] = next[previousId];
          delete next[previousId];
        }
        return next;
      });
    }
    return safe.id; // Return the new id for selection tracking
  }

  function deleteNode(nodeId: string) {
    setArchitecture((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    }));
    setNodePositions((prev) => { const next = { ...prev }; delete next[nodeId]; return next; });
    setLayoutVersion((v) => v + 1);
  }

  function updateEdge(updated: ArchitectureEdge, selectedEdgeKey: { from: string; to: string }) {
    setArchitecture((prev) => ({
      ...prev,
      edges: prev.edges.map((e) =>
        e.from === selectedEdgeKey.from && e.to === selectedEdgeKey.to ? updated : e
      ),
    }));
  }

  function deleteEdge(selectedEdgeKey: { from: string; to: string }) {
    setArchitecture((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => !(e.from === selectedEdgeKey.from && e.to === selectedEdgeKey.to)),
    }));
    setLayoutVersion((v) => v + 1);
  }

  function addNode(templateKey: string, cyExtent?: { x1: number; y1: number; w: number; h: number }) {
    const template = NODE_LIBRARY.find((e) => e.key === templateKey);
    if (!template) return null;
    const nextId = createNodeIdFromBase(architecture, template.node.id);
    const nextPosition = cyExtent
      ? { x: cyExtent.x1 + cyExtent.w / 2 + (Math.random() - 0.5) * 120, y: cyExtent.y1 + cyExtent.h / 2 + (Math.random() - 0.5) * 120 }
      : undefined;
    const newNode: ArchitectureNode = {
      ...template.node,
      id: nextId,
      label: createLabelFromBase(template.node.label ?? template.label, nextId, template.node.id),
    };
    setArchitecture((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    if (nextPosition) setNodePositions((prev) => ({ ...prev, [nextId]: nextPosition }));
    return nextId;
  }

  function addEdge(sourceId: string, targetId: string) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const exists = architecture.edges.some((e) => e.from === sourceId && e.to === targetId);
    if (exists) return;
    const newEdge: ArchitectureEdge = {
      from: sourceId, to: targetId, protocol: "https", label: "",
      data_classification: "", carries_identity: true, transforms_input: false, queue: false,
    };
    setArchitecture((prev) => ({ ...prev, edges: [...prev.edges, newEdge] }));
    setLayoutVersion((v) => v + 1);
  }

  function loadSample() {
    setArchitecture(clone(sampleArchitecture));
    setNodePositions({});
    setLayoutVersion((v) => v + 1);
  }

  function loadFromAnalysis(arch: ArchitectureDocument) {
    setArchitecture(clone(arch));
    setNodePositions({});
    setLayoutVersion((v) => v + 1);
  }

  return {
    architecture, setArchitecture, nodePositions, setNodePositions, layoutVersion, setLayoutVersion,
    handleNodeMove, updateNode, deleteNode, updateEdge, deleteEdge,
    addNode, addEdge, loadSample, loadFromAnalysis,
  };
}