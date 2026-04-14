import type { ArchitectureDocument } from "../types/architecture";
import type { AnalysisResponse } from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function fetchSample(): Promise<{ document: string; format: string }> {
  const res = await fetch(`${API_BASE}/api/v1/sample`);
  if (!res.ok) throw new Error("Failed to fetch sample.");
  return res.json();
}

export async function analyzeArchitecture(body: {
  architecture?: ArchitectureDocument;
  document?: string;
  format?: string;
}): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json()) as { detail?: string };
    throw new Error(payload.detail ?? "Analysis failed.");
  }
  return res.json();
}