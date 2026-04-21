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
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Cannot connect to backend at ${API_BASE}. Make sure the server is running.`
    );
  }
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const payload = (await res.json()) as { detail?: string };
      detail = payload.detail;
    } catch {
      /* response body wasn't JSON — fall through to default message */
    }
    throw new Error(
      detail ?? `Server error (HTTP ${res.status}). Please try again.`
    );
  }
  return res.json();
}