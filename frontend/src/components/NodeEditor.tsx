import type { ArchitectureNode, TrustLevel, IdentityMechanism, AuthorizationModel } from "../types/architecture";
import { TRUST_LEVELS, IDENTITY_MECHANISMS, AUTHORIZATION_MODELS, NODE_TYPE_SUGGESTIONS } from "../constants/enums";

interface NodeEditorProps {
    node: ArchitectureNode;
    onUpdate: (updated: ArchitectureNode) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
}

export default function NodeEditor({ node, onUpdate, onDelete, onClose }: NodeEditorProps) {
    function set<K extends keyof ArchitectureNode>(key: K, value: ArchitectureNode[K]) {
        onUpdate({ ...node, [key]: value });
    }

    return (
        <div className="inspector-panel" onClick={(e) => e.stopPropagation()}>
            <div className="inspector-header">
                <h3>Node Inspector</h3>
                <button className="inspector-close" type="button" onClick={onClose} aria-label="Close">&#x2715;</button>
            </div>
            <div className="inspector-body">
                <div className="editor-grid">
                    <label><span className="field-label">Id</span><input type="text" value={node.id} readOnly title="System managed identifier" style={{ opacity: 0.6, cursor: "not-allowed" }} /></label>
                    <label><span className="field-label">Label</span><input type="text" value={node.label ?? ""} onChange={(e) => set("label", e.target.value)} /></label>
                    <label><span className="field-label">Type</span><input list="node-type-options" type="text" value={node.type} onChange={(e) => set("type", e.target.value)} /></label>
                    <label><span className="field-label">Trust Level</span>
                        <select value={node.trust_level} onChange={(e) => set("trust_level", e.target.value as TrustLevel)}>
                            {TRUST_LEVELS.map((tl) => <option key={tl} value={tl}>{tl}</option>)}
                        </select>
                    </label>
                    <label><span className="field-label">Auth</span>
                        <select value={node.auth ?? ""} onChange={(e) => set("auth", e.target.value ? (e.target.value as IdentityMechanism) : null)}>
                            <option value="">Not set</option>
                            {IDENTITY_MECHANISMS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </label>
                    <label><span className="field-label">Authorization</span>
                        <select value={node.authorization ?? ""} onChange={(e) => set("authorization", e.target.value ? (e.target.value as AuthorizationModel) : null)}>
                            <option value="">Not set</option>
                            {AUTHORIZATION_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </label>
                    <label className="editor-span"><span className="field-label">Description</span><textarea className="mini-textarea" value={node.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
                    <label className="editor-span"><span className="field-label">Tags</span><input type="text" value={node.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} placeholder="edge, payments, identity" /></label>
                </div>
                <div className="checkbox-row" style={{ marginTop: 12 }}>
                    <label className="check-pill"><input type="checkbox" checked={node.accepts_untrusted_input} onChange={(e) => set("accepts_untrusted_input", e.target.checked)} /><span>Accepts untrusted input</span></label>
                    <label className="check-pill"><input type="checkbox" checked={node.exposes_public_endpoint} onChange={(e) => set("exposes_public_endpoint", e.target.checked)} /><span>Exposes public endpoint</span></label>
                </div>
                <div className="inspector-actions">
                    <button className="danger-button" type="button" onClick={() => onDelete(node.id)}>Delete Node</button>
                </div>
            </div>
            <datalist id="node-type-options">
                {NODE_TYPE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
            </datalist>
        </div>
    );
}