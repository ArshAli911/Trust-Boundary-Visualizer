import { ChangeEvent, FormEvent, startTransition, useEffect, useState } from "react";

import GraphCanvas from "./GraphCanvas";
import type { AnalysisResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

const fallbackDocument = `nodes:
  - id: gateway
    type: api_gateway
    trust_level: external
    exposes_public_endpoint: true
  - id: auth
    type: auth_service
    trust_level: internal
    auth: jwt
    authorization: role_based
  - id: billing
    type: microservice
    trust_level: internal
    auth: jwt
    authorization: role_based
  - id: worker
    type: background_worker
    trust_level: privileged
    auth: service_account
  - id: database
    type: database
    trust_level: restricted
edges:
  - from: gateway
    to: auth
    protocol: https
  - from: auth
    to: billing
    protocol: https
  - from: billing
    to: worker
    protocol: queue
    queue: true
    carries_identity: false
  - from: worker
    to: database
    protocol: postgres
`;

export default function App() {
  const [document, setDocument] = useState(fallbackDocument);
  const [format, setFormat] = useState<"auto" | "yaml" | "json">("yaml");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadSample = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/sample`);
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { document: string; format: "yaml" | "json" };
        if (!cancelled) {
          setDocument(payload.document);
          setFormat(payload.format);
        }
      } catch {
        // Keep the local fallback sample when the API is not reachable yet.
      }
    };

    loadSample();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          document,
          format
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { detail?: string };
        throw new Error(payload.detail ?? "Analysis failed.");
      }

      const payload = (await response.json()) as AnalysisResponse;
      startTransition(() => {
        setAnalysis(payload);
        setLayoutVersion((current) => current + 1);
      });
    } catch (caught) {
      setAnalysis(null);
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const normalizedName = file.name.toLowerCase();
      const inferredFormat = normalizedName.endsWith(".json")
        ? "json"
        : normalizedName.endsWith(".yaml") || normalizedName.endsWith(".yml")
          ? "yaml"
          : "auto";

      setDocument(text);
      setFormat(inferredFormat);
      setLoadedFileName(file.name);
      setError(null);
    } catch {
      setError("Unable to read the selected file.");
    } finally {
      event.target.value = "";
    }
  }

  function handleLoadSample() {
    setDocument(fallbackDocument);
    setFormat("yaml");
    setLoadedFileName(null);
    setError(null);
  }

  function handleResetLayout() {
    setLayoutVersion((current) => current + 1);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Security Architecture Analysis Tool</p>
          <h1>Trust Boundary Visualizer</h1>
        </div>
        <p className="hero-copy">
          Model distributed systems as graphs, detect trust transitions, and surface attack
          chains that move untrusted input into privileged or restricted tiers.
        </p>
      </header>

      <main className="workspace">
        <section className="panel input-panel">
          <div className="panel-heading">
            <h2>Architecture Input</h2>
            <span className="status">{loading ? "Analyzing..." : "Ready"}</span>
          </div>
          <form onSubmit={handleAnalyze}>
            <div className="field-row">
              <div>
                <label className="field-label" htmlFor="format">
                  Format
                </label>
                <select
                  id="format"
                  value={format}
                  onChange={(event) => setFormat(event.target.value as "auto" | "yaml" | "json")}
                >
                  <option value="yaml">YAML</option>
                  <option value="json">JSON</option>
                  <option value="auto">Auto Detect</option>
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="architecture-file">
                  Import File
                </label>
                <label className="file-picker" htmlFor="architecture-file">
                  <span>{loadedFileName ?? "Choose YAML or JSON file"}</span>
                  <strong>Browse</strong>
                </label>
                <input
                  id="architecture-file"
                  className="visually-hidden"
                  type="file"
                  accept=".yaml,.yml,.json,application/json,text/yaml,text/x-yaml"
                  onChange={handleFileImport}
                />
              </div>
            </div>

            <label className="field-label" htmlFor="document">
              Architecture Definition
            </label>
            <textarea
              id="document"
              value={document}
              onChange={(event) => setDocument(event.target.value)}
              spellCheck={false}
            />

            <div className="action-row">
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "Running Analysis" : "Analyze Architecture"}
              </button>
              <button className="secondary-button" type="button" onClick={handleLoadSample}>
                Load Sample
              </button>
            </div>
          </form>
          {error ? <p className="error-banner">{error}</p> : null}
        </section>

        <section className="panel graph-panel">
          <div className="panel-heading">
            <h2>Topology Graph</h2>
            <div className="graph-toolbar">
              <div className="legend">
                <span className="legend-chip external">External</span>
                <span className="legend-chip internal">Internal</span>
                <span className="legend-chip privileged">Privileged</span>
                <span className="legend-chip restricted">Restricted</span>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={handleResetLayout}
                disabled={!analysis}
              >
                Reset Layout
              </button>
            </div>
          </div>
          {analysis ? (
            <GraphCanvas
              key={layoutVersion}
              nodes={analysis.graph.nodes}
              edges={analysis.graph.edges}
            />
          ) : (
            <div className="empty-state">Run an analysis to render the architecture graph.</div>
          )}
        </section>

        <section className="panel findings-panel">
          <div className="panel-heading">
            <h2>Security Findings</h2>
          </div>
          {analysis ? (
            <>
              <div className="summary-grid">
                <SummaryCard label="Nodes" value={analysis.summary.node_count} />
                <SummaryCard label="Edges" value={analysis.summary.edge_count} />
                <SummaryCard label="Boundaries" value={analysis.summary.trust_boundaries} />
                <SummaryCard label="Attack Paths" value={analysis.summary.attack_paths} />
                <SummaryCard label="Identity Risks" value={analysis.summary.identity_findings} />
                <SummaryCard label="Escalations" value={analysis.summary.escalation_findings} />
              </div>

              <FindingsSection
                title="Attack Chains"
                items={analysis.attack_paths.map((finding) => ({
                  title: finding.path.join(" -> "),
                  severity: finding.severity,
                  detail: finding.rationale,
                  recommendation: finding.recommendation
                }))}
              />

              <FindingsSection
                title="Trust Boundaries"
                items={analysis.trust_boundaries.map((finding) => ({
                  title: `${finding.source} -> ${finding.target} (${finding.from_trust} -> ${finding.to_trust})`,
                  severity: finding.severity,
                  detail: finding.rationale
                }))}
              />

              <FindingsSection
                title="Identity Propagation"
                items={analysis.identity_findings.map((finding) => ({
                  title: `${finding.source} -> ${finding.target}`,
                  severity: finding.severity,
                  detail: finding.rationale,
                  recommendation: finding.recommendation
                }))}
              />

              <FindingsSection
                title="Privilege Escalation"
                items={analysis.escalation_findings.map((finding) => ({
                  title: `${finding.pattern} :: ${finding.path.join(" -> ")}`,
                  severity: finding.severity,
                  detail: finding.rationale,
                  recommendation: finding.recommendation
                }))}
              />

              <FindingsSection
                title="Attack Chain Report"
                items={analysis.report.map((entry) => ({
                  title: entry.title,
                  severity: "report",
                  detail: entry.risk,
                  recommendation: entry.recommendation
                }))}
              />
            </>
          ) : (
            <div className="empty-state">
              Findings will appear here after the backend returns a graph analysis report.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FindingsSection({
  title,
  items
}: {
  title: string;
  items: Array<{
    title: string;
    severity: string;
    detail: string;
    recommendation?: string;
  }>;
}) {
  return (
    <section className="findings-section">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <div className="empty-list">No findings in this category.</div>
      ) : (
        <div className="finding-list">
          {items.map((item) => (
            <article className="finding-card" key={`${title}-${item.title}`}>
              <div className="finding-header">
                <strong>{item.title}</strong>
                <span className={`severity severity-${item.severity}`}>{item.severity}</span>
              </div>
              <p>{item.detail}</p>
              {item.recommendation ? <p className="recommendation">{item.recommendation}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
