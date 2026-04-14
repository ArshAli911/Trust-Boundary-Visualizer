import { useState } from "react";
import type { AnalysisResponse } from "../types/api";
import { analyzeArchitecture } from "../api/analyze";
import type { ArchitectureDocument } from "../types/architecture";

export function useAnalysis() {
    const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function analyze(architecture: ArchitectureDocument) {
        setLoading(true);
        setError(null);
        try {
            const payload = await analyzeArchitecture({ architecture });
            setAnalysis(payload);
            return payload;
        } catch (caught) {
            setAnalysis(null);
            setError(caught instanceof Error ? caught.message : "Analysis failed.");
            return null;
        } finally {
            setLoading(false);
        }
    }

    async function importDocument(text: string, format: "yaml" | "json" | "auto") {
        setLoading(true);
        setError(null);
        try {
            const payload = await analyzeArchitecture({ document: text, format });
            setAnalysis(payload);
            return payload;
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Import failed.");
            return null;
        } finally {
            setLoading(false);
        }
    }

    return { analysis, loading, error, setError, analyze, importDocument };
}
