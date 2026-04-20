import type { ArchitectureDocument } from "../types/architecture";

export function createNodeId(arch: ArchitectureDocument): string {
  return `node_${Math.random().toString(36).substr(2, 9)}`;
}

export function createNodeIdFromBase(arch: ArchitectureDocument, baseId: string): string {
  return `${baseId}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createLabelFromBase(baseLabel: string, nextId: string, baseId: string): string {
  return baseLabel;
}