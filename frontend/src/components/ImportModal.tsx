import { ChangeEvent, useRef, useState } from "react";

interface ImportModalProps {
    onImport: (text: string, format: "yaml" | "json" | "auto") => void;
    onClose: () => void;
}

export default function ImportModal({ onImport, onClose }: ImportModalProps) {
    const [importText, setImportText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        file.text().then((text) => {
            const name = file.name.toLowerCase();
            const fmt: "yaml" | "json" | "auto" = name.endsWith(".json") ? "json" : name.endsWith(".yaml") || name.endsWith(".yml") ? "yaml" : "auto";
            onImport(text, fmt);
            onClose();
        });
        event.target.value = "";
    }

    function handlePasteSubmit() {
        if (!importText.trim()) return;
        onImport(importText, "auto");
        onClose();
    }

    return (
        <div className="import-overlay" onClick={onClose}>
            <div className="import-modal" onClick={(e) => e.stopPropagation()}>
                <div className="inspector-header">
                    <h3>Import Architecture</h3>
                    <button className="inspector-close" type="button" onClick={onClose} aria-label="Close">&#x2715;</button>
                </div>
                <p className="import-hint">Paste YAML or JSON, or pick a file.</p>
                <textarea
                    className="import-textarea"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={"nodes:\n  - id: gateway\n    type: api_gateway\n    trust_level: external\nedges:\n  - from: gateway\n    to: auth\n    protocol: https"}
                    spellCheck={false}
                />
                <div className="import-actions">
                    <button className="primary-button" type="button" onClick={handlePasteSubmit} disabled={!importText.trim()}>Load Pasted</button>
                    <label className="secondary-button import-file-btn">
                        Browse File
                        <input ref={fileInputRef} className="visually-hidden" type="file" accept=".yaml,.yml,.json" onChange={handleFileChange} />
                    </label>
                </div>
            </div>
        </div>
    );
}