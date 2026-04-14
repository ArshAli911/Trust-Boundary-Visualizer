import type { ArchitectureEdge } from "../types/architecture";
import { PROTOCOL_SUGGESTIONS } from "../constants/enums";

interface EdgeEditorProps {
    edge: ArchitectureEdge;
    nodeIds: string[];
    onUpdate: (updated: ArchitectureEdge) => void;
    onDelete: () => void;
    onClose: () => void;
}

export default function EdgeEditor({ edge, nodeIds, onUpdate, onDelete, onClose }: EdgeEditorProps) {
    function set<K extends keyof ArchitectureEdge>(key: K, value: ArchitectureEdge[K]) {
        onUpdate({ ...edge, [key]: value });
    }

    return (
        <div className="inspector-panel" onClick={(e) => e.stopPropagation()}>
            <div className="inspector-header">
                <h3>Edge Inspector</h3>
                <button className="inspector-close" type="button" onClick={onClose} aria-label="Close">&#x2715;</button>
            </div>
            <div className="inspector-body">
                <div className="editor-grid">
                    <label><span className="field-label">From</span>
                        <select value={edge.from} onChange={(e) => set("from", e.target.value)}>
                            {nodeIds.map((id) => <option key={id} value={id}>{id}</option>)}
                        </select>
                    </label>
                    <label><span className="field-label">To</span>
                        <select value={edge.to} onChange={(e) => set("to", e.target.value)}>
                            {nodeIds.map((id) => <option key={id} value={id}>{id}</option>)}
                        </select>
                    </label>
                    <label><span className="field-label">Protocol</span><input list="protocol-options" type="text" value={edge.protocol ?? ""} onChange={(e) => set("protocol", e.target.value)} /></label>
                    <label><span className="field-label">Label</span><input type="text" value={edge.label ?? ""} onChange={(e) => set("label", e.target.value)} /></label>
                    <label className="editor-span"><span className="field-label">Data Classification</span><input type="text" value={edge.data_classification ?? ""} onChange={(e) => set("data_classification", e.target.value)} placeholder="public, internal, restricted" /></label>
                </div>
                <div className="checkbox-row" style={{ marginTop: 12 }}>
                    <label className="check-pill"><input type="checkbox" checked={edge.carries_identity} onChange={(e) => set("carries_identity", e.target.checked)} /><span>Carries identity</span></label>
                    <label className="check-pill"><input type="checkbox" checked={edge.transforms_input} onChange={(e) => set("transforms_input", e.target.checked)} /><span>Transforms input</span></label>
                    <label className="check-pill"><input type="checkbox" checked={edge.queue} onChange={(e) => set("queue", e.target.checked)} /><span>Queue hop</span></label>
                </div>
                <div className="inspector-actions">
                    <button className="danger-button" type="button" onClick={onDelete}>Delete Edge</button>
                </div>
            </div>
            <datalist id="protocol-options">
                {PROTOCOL_SUGGESTIONS.map((p) => <option key={p} value={p} />)}
            </datalist>
        </div>
    );
}