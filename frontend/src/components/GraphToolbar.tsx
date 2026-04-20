import { useState } from "react";
import ImportModal from "./ImportModal";

interface GraphToolbarProps {
    nodeLibrary: Array<{ key: string; label: string }>;
    nodeIds: string[];
    nodeCount: number;
    edgeCount: number;
    loading: boolean;
    onAddNode: (templateKey: string) => void;
    onAnalyze: () => void;
    onLoadSample: () => void;
    onResetLayout: () => void;
    onImport: (text: string, format: "yaml" | "json" | "auto") => void;
}

export default function GraphToolbar({
    nodeLibrary, nodeIds, nodeCount, edgeCount, loading,
    onAddNode, onAnalyze, onLoadSample, onResetLayout, onImport,
}: GraphToolbarProps) {
    const [showImport, setShowImport] = useState(false);
    const [nextNodeType, setNextNodeType] = useState(nodeLibrary[0]?.key ?? "");

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



            {showImport && (
                <ImportModal onImport={onImport} onClose={() => setShowImport(false)} />
            )}
        </>
    );
}