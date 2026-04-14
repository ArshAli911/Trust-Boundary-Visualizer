import type { ArchitectureDocument } from "../types/architecture";

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