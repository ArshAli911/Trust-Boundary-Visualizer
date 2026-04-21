# Trust Boundary Visualizer

Trust Boundary Visualizer is a full-stack tool for modeling distributed systems as directed graphs and reasoning about trust transitions, attack paths, identity propagation issues, and privilege-escalation patterns. Build your architecture visually, then analyze it to surface security findings.

## Repository Structure

```text
Trust-Boundary-Visualizer/
|-- .gitignore
|-- README.md
|-- backend/
|   |-- pytest.ini
|   |-- requirements.txt
|   |-- app/
|   |   |-- __init__.py
|   |   |-- analysis.py
|   |   |-- main.py
|   |   |-- models.py
|   |   `-- parser.py
|   `-- tests/
|       |-- test_analysis.py
|       |-- test_analysis_edge_cases.py
|       `-- test_parser.py
|-- examples/
|   |-- sample-architecture.yaml
|   `-- e-commerce-platform.yaml
`-- frontend/
    |-- index.html
    |-- package.json
    |-- tsconfig.json
    |-- vite.config.ts
    `-- src/
        |-- main.tsx
        |-- vite-env.d.ts
        |-- api/
        |   `-- analyze.ts
        |-- components/
        |   |-- App.tsx
        |   |-- EdgeEditor.tsx
        |   |-- FindingsPanel.tsx
        |   |-- GraphCanvas.tsx
        |   |-- GraphToolbar.tsx
        |   |-- ImportModal.tsx
        |   |-- NodeEditor.tsx
        |   `-- SummaryCard.tsx
        |-- constants/
        |   |-- enums.ts
        |   |-- nodelibrary.ts
        |   `-- sampleArchitecture.ts
        |-- hooks/
        |   |-- useAnalysis.ts
        |   |-- useArchitecture.ts
        |   `-- useSelection.ts
        |-- style/
        |   |-- canvas.css
        |   |-- finding.css
        |   |-- index.css
        |   |-- inspector.css
        |   |-- modal.css
        |   |-- picker.css
        |   `-- toolbar.css
        |-- types/
        |   |-- api.ts
        |   |-- architecture.ts
        |   |-- findings.ts
        |   `-- graph.ts
        `-- utils/
            |-- buildGraph.ts
            |-- clone.ts
            `-- ids.ts
```

## What Each Part Does

### Backend

- **`app/main.py`** — FastAPI application. Exposes `GET /api/v1/health`, `GET /api/v1/sample`, and `POST /api/v1/analyze`.
- **`app/models.py`** — Pydantic schemas for nodes, edges, requests, findings, summaries, and graph output. The entire backend contract is centralized here.
- **`app/parser.py`** — Converts YAML or JSON text into an `ArchitectureDocument`. Kept separate so parsing logic is reusable and testable.
- **`app/analysis.py`** — Core business logic. Builds a NetworkX directed graph, runs trust-boundary and attack-path heuristics, and produces the report and graph view consumed by the frontend.
- **`tests/test_analysis.py`** — Smoke test verifying a minimal architecture produces attack-path, identity, and escalation findings.
- **`tests/test_analysis_edge_cases.py`** — Edge-case coverage for the analysis pipeline.
- **`tests/test_parser.py`** — Tests for YAML/JSON parsing.

### Frontend

The frontend follows a modular architecture organized by concern.

#### `api/`

- **`analyze.ts`** — API client. Exports `fetchSample()` and `analyzeArchitecture()` for communicating with the backend. Reads `VITE_API_BASE` for the API URL (defaults to `http://localhost:8000`).

#### `components/`

- **`App.tsx`** — Root component. Orchestrates architecture state, selection state, analysis calls, and renders the workspace layout with toolbar, graph canvas, inspectors, and findings panel.
- **`GraphCanvas.tsx`** — Cytoscape-powered interactive graph renderer. Supports node dragging, edge drawing via edge handles, click-to-select, and drag-to-spawn (dropping an edge on empty space triggers a node picker).
- **`GraphToolbar.tsx`** — Toolbar above the graph canvas. Provides controls for adding nodes from the node library, loading samples, importing YAML/JSON, running analysis, and resetting layout.
- **`NodeEditor.tsx`** — Right-side inspector panel for editing a selected node's properties (id, label, type, trust level).
- **`EdgeEditor.tsx`** — Right-side inspector panel for editing a selected edge's properties (endpoints, protocol, data classification, identity flags).
- **`FindingsPanel.tsx`** — Renders analysis results: summary cards, attack paths, trust boundary crossings, identity findings, escalation findings, and the report.
- **`ImportModal.tsx`** — Modal for importing architecture definitions from YAML or JSON text.
- **`SummaryCard.tsx`** — Small presentational component for rendering summary metric cards.

#### `hooks/`

- **`useArchitecture.ts`** — State management for the architecture document. Handles adding, updating, and deleting nodes and edges, loading samples, and syncing with analysis results.
- **`useAnalysis.ts`** — State management for analysis API calls. Wraps `analyze()` and `importDocument()` with loading and error state.
- **`useSelection.ts`** — Tracks which node or edge is currently selected in the graph.

#### `constants/`

- **`nodelibrary.ts`** — Built-in node templates (e.g., Web App, API, Database, Queue, Worker) users can drag onto the canvas.
- **`sampleArchitecture.ts`** — Default architecture document loaded on startup.
- **`enums.ts`** — Shared enum values for trust levels, node types, and protocols.

#### `types/`

- **`architecture.ts`** — TypeScript types for `ArchitectureDocument`, `ArchitectureNode`, and `ArchitectureEdge`.
- **`api.ts`** — TypeScript type for `AnalysisResponse`.
- **`findings.ts`** — TypeScript types for findings (attack paths, boundaries, identity, escalations, report entries).
- **`graph.ts`** — TypeScript types for `GraphNode` and `GraphEdge` used by the canvas.

#### `utils/`

- **`buildGraph.ts`** — Transforms an `ArchitectureDocument` into `GraphNode[]` and `GraphEdge[]` for the canvas, applying saved node positions.
- **`ids.ts`** — Generates unique node IDs and labels when adding nodes from the library.
- **`clone.ts`** — Deep-clone utility for immutable state updates.

#### `style/`

- **`index.css`** — Global layout, page shell, hero section, and responsive design.
- **`canvas.css`** — Graph canvas container styles.
- **`toolbar.css`** — Toolbar layout and button styles.
- **`inspector.css`** — Node and edge editor panel styles.
- **`finding.css`** — Findings cards and result panel styles.
- **`modal.css`** — Import modal styles.
- **`picker.css`** — Node picker overlay styles (for drag-to-spawn).

### Examples

- **`sample-architecture.yaml`** — Minimal architecture for quick testing.
- **`e-commerce-platform.yaml`** — Larger multi-tier architecture example.

## Request Flow

1. The user builds an architecture visually on the graph canvas (add nodes from the library, draw edges by dragging).
2. Clicking **Analyze** calls `handleAnalyze()` in `App.tsx`.
3. `useAnalysis.analyze()` posts the architecture document to `POST /api/v1/analyze`.
4. `backend/app/main.py` receives the request.
5. If raw text is provided, `parse_architecture()` in `parser.py` converts YAML/JSON into an `ArchitectureDocument`.
6. `analyze_architecture()` in `analysis.py` builds the graph, runs all detection heuristics, and assembles the response.
7. The frontend receives the `AnalysisResponse`.
8. `FindingsPanel` renders summaries and findings. The graph updates with analysis-enriched data.

## Analysis Heuristics

The backend splits detection into focused functions:

| Function | Purpose |
|---|---|
| `build_graph()` | Converts architecture models into a NetworkX directed graph |
| `detect_trust_boundaries()` | Scans edges crossing trust levels |
| `detect_attack_paths()` | Finds shortest routes from untrusted entry points to sensitive sinks |
| `detect_identity_findings()` | Detects dropped or missing identity at inward trust transitions |
| `detect_privilege_escalations()` | Adds escalation heuristics on top of path analysis (queues, workers, control planes) |
| `build_report()` | Flattens findings into a readable report |
| `build_graph_view()` | Creates frontend-ready graph payload with styling flags |
| `classify_boundary_severity()` | Centralizes trust-delta severity logic |
| `find_untrusted_sources()` | Identifies graph entry points for attack-path search |
| `recommend_for_sink()` | Attaches remediation guidance based on sink type |
| `dedupe_paths()` / `dedupe_escalations()` | Removes duplicate findings |

## Technology Choices

| Layer | Technology | Rationale |
|---|---|---|
| Backend | FastAPI + Pydantic | Schema-heavy, endpoint-light API |
| Graph engine | NetworkX | Path and graph reasoning are central to the product |
| Frontend | React + Vite + TypeScript | Single interactive page, fast dev iteration |
| Graph rendering | Cytoscape.js + edgehandles | Graph-native output with interactive editing |

## How To Run

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Default API target: `http://localhost:8000`. Override with `VITE_API_BASE` if needed.

### Tests

```powershell
cd backend
pytest
```

## Current Gaps

- Backend test coverage is still thin (3 test files covering the core paths).
- The analysis engine is heuristic-based. It is useful for architecture review, but does not prove exploitability.
