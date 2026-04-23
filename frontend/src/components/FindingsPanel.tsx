import type { AnalysisResponse } from "../types/api";
import SummaryCard from "./SummaryCard";

function FindingsSection({ title, items }: {
    title: string;
    items: Array<{ title: string; severity: string; detail: string; recommendation?: string }>;
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

interface FindingsPanelProps {
    analysis: AnalysisResponse | null;
}

export default function FindingsPanel({ analysis }: FindingsPanelProps) {
    return (
        <section className="panel findings-panel">
            <div className="panel-heading"><h2>Security Findings</h2></div>
            {analysis ? (
                <>
                    <div className="summary-grid">
                        <SummaryCard label="Nodes" value={analysis.summary.node_count} />
                        <SummaryCard label="Edges" value={analysis.summary.edge_count} />
                        <SummaryCard label="Boundaries" value={analysis.summary.trust_boundaries} />
                        <SummaryCard label="Attack Paths" value={analysis.summary.attack_paths} />
                        <SummaryCard label="Identity Risks" value={analysis.summary.identity_findings} />
                        <SummaryCard label="Escalations" value={analysis.summary.escalation_findings} />
                        <SummaryCard label="Data Exposure" value={analysis.summary.data_exposure_findings} />
                        <SummaryCard label="Lateral Movement" value={analysis.summary.lateral_movement_findings} />
                        <SummaryCard label="Misconfigurations" value={analysis.summary.misconfiguration_findings} />
                    </div>
                    <FindingsSection title="Attack Chains" items={analysis.attack_paths.map((f) => ({ title: f.path.join(" -> "), severity: f.severity, detail: f.rationale, recommendation: f.recommendation }))} />
                    <FindingsSection title="Trust Boundaries" items={analysis.trust_boundaries.map((f) => ({ title: `${f.source} -> ${f.target} (${f.from_trust} -> ${f.to_trust})`, severity: f.severity, detail: f.rationale }))} />
                    <FindingsSection title="Identity Propagation" items={analysis.identity_findings.map((f) => ({ title: `${f.source} -> ${f.target}`, severity: f.severity, detail: f.rationale, recommendation: f.recommendation }))} />
                    <FindingsSection title="Privilege Escalation" items={analysis.escalation_findings.map((f) => ({ title: `${f.pattern} :: ${f.path.join(" -> ")}`, severity: f.severity, detail: f.rationale, recommendation: f.recommendation }))} />
                    <FindingsSection title="Data Exposure" items={analysis.data_exposure_findings.map((f) => ({ title: `${f.source} -> ${f.target}`, severity: f.severity, detail: f.rationale, recommendation: f.recommendation }))} />
                    <FindingsSection title="Lateral Movement" items={analysis.lateral_movement_findings.map((f) => ({ title: f.path.join(" -> "), severity: f.severity, detail: f.rationale, recommendation: f.recommendation }))} />
                    <FindingsSection title="Misconfigurations" items={analysis.misconfiguration_findings.map((f) => ({ title: `${f.pattern} :: ${f.node}`, severity: f.severity, detail: f.rationale, recommendation: f.recommendation }))} />
                    <FindingsSection title="Attack Chain Report" items={analysis.report.map((e) => ({ title: e.title, severity: "report", detail: e.risk, recommendation: e.recommendation }))} />
                </>
            ) : (
                <div className="empty-state">
                    Build a graph visually, then run analysis to detect escalation paths and trust-boundary issues.
                </div>
            )}
        </section>
    );
}