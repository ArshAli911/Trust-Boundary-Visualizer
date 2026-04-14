# Frontend Rebuild — File-by-File Code Map

The current frontend is a monolithic React+Vite+TypeScript app with tangled responsibilities. This plan **deletes all existing `src/` files** and replaces them with a clean, well-separated structure. The backend (FastAPI) stays untouched.

## Current State (will be deleted)

| File | Lines | Role |
|------|-------|------|
| [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) | 586 | Everything: state, API calls, layout, node library, utilities |
| [GraphCanvas.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/GraphCanvas.tsx) | 400 | Cytoscape renderer + edge-handles |
| [GraphToolbar.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/GraphToolbar.tsx) | 143 | Toolbar + import modal |
| [NodeEditor.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/NodeEditor.tsx) | 97 | Node inspector panel |
| [EdgeEditor.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/EdgeEditor.tsx) | 79 | Edge inspector panel |
| [types.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts) | 122 | All type definitions |
| [styles.css](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/styles.css) | ~300 | Single CSS file |
| [main.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/main.tsx) | 6 | React root |
| [vite-env.d.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/vite-env.d.ts) | 1 | Vite type shim |

---

## New Structure

```
frontend/src/
├── main.tsx                    # React root (unchanged role)
├── vite-env.d.ts               # Vite type shim (unchanged)
│
├── types/
│   ├── architecture.ts         # ArchitectureNode, ArchitectureEdge, ArchitectureDocument
│   ├── graph.ts                # GraphNode, GraphEdge (view-layer types)
│   ├── findings.ts             # BoundaryFinding, AttackPathFinding, IdentityFinding, etc.
│   └── api.ts                  # AnalysisResponse, AnalyzeRequest, API summary types
│
├── constants/
│   ├── nodeLibrary.ts          # NODE_LIBRARY array (the 7 template nodes from App.tsx)
│   ├── sampleArchitecture.ts   # sampleArchitecture object (moved from App.tsx)
│   └── enums.ts                # TRUST_LEVELS[], IDENTITY_MECHANISMS[], AUTH_MODELS[], etc.
│
├── api/
│   └── analyze.ts              # fetchSample(), analyzeArchitecture() — HTTP calls to backend
│
├── utils/
│   ├── clone.ts                # clone<T>() deep-clone helper
│   ├── ids.ts                  # createNodeId(), createNodeIdFromBase(), createLabelFromBase()
│   └── buildGraph.ts           # buildGraph(arch, positions) → { nodes, edges }
│
├── hooks/
│   ├── useArchitecture.ts      # All architecture state: nodes, edges, positions, add/update/delete
│   ├── useSelection.ts         # Selected node/edge tracking + handlers
│   └── useAnalysis.ts          # Analysis API call state: loading, response, error, trigger
│
├── components/
│   ├── App.tsx                 # Shell layout: Toolbar | Canvas + Inspector | Findings
│   ├── GraphCanvas.tsx         # Cytoscape renderer (mostly same logic, cleaner props)
│   ├── GraphToolbar.tsx        # Top toolbar (same UI, smaller — no state logic)
│   ├── NodeEditor.tsx          # Right-side node inspector (same UI)
│   ├── EdgeEditor.tsx          # Right-side edge inspector (same UI)
│   ├── ImportModal.tsx         # Import overlay (extracted from GraphToolbar)
│   ├── FindingsPanel.tsx       # Summary cards + findings accordion (extracted from App)
│   └── SummaryCard.tsx         # Single metric card component
│
├── styles/
│   ├── index.css               # Global reset, CSS variables, body/root
│   ├── toolbar.css             # Toolbar styles
│   ├── canvas.css              # Graph canvas container
│   ├── inspector.css           # Node/Edge inspector panels
│   ├── findings.css            # Findings panel + summary cards
│   └── modal.css               # Import modal overlay
```

---

## What Goes Where — Detailed Breakdown

### `types/` — Pure TypeScript interfaces

#### [NEW] `types/architecture.ts`
- [TrustLevel](file:///d:/Extras/Trust-Boundary-Visualizer/backend/app/models.py#9-14), [IdentityMechanism](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts#3-4), [AuthorizationModel](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts#5-6) type aliases
- [ArchitectureNode](file:///d:/Extras/Trust-Boundary-Visualizer/backend/app/models.py#31-44), [ArchitectureEdge](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts#20-30), [ArchitectureDocument](file:///d:/Extras/Trust-Boundary-Visualizer/backend/app/models.py#59-83) interfaces
- Moved verbatim from current [types.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts) lines 1–35

#### [NEW] `types/graph.ts`
- [GraphNode](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts#37-50), [GraphEdge](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts#51-59) interfaces (the Cytoscape-facing view types)
- Moved from current [types.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts) lines 37–58

#### [NEW] `types/findings.ts`
- [BoundaryFinding](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts#60-68), [AttackPathFinding](file:///d:/Extras/Trust-Boundary-Visualizer/backend/app/models.py#106-114), [IdentityFinding](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts#79-86), [EscalationFinding](file:///d:/Extras/Trust-Boundary-Visualizer/backend/app/models.py#124-130), [ReportEntry](file:///d:/Extras/Trust-Boundary-Visualizer/backend/app/models.py#132-137)
- Moved from current [types.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts) lines 60–100

#### [NEW] `types/api.ts`
- [AnalysisResponse](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts#102-122) interface (wraps summary + findings + graph)
- Moved from current [types.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/types.ts) lines 102–122

---

### `constants/` — Static data

#### [NEW] `constants/nodeLibrary.ts`
- The `NODE_LIBRARY` array (7 preconfigured template nodes)
- Moved from current [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) lines 13–148

#### [NEW] `constants/sampleArchitecture.ts`
- The `sampleArchitecture` object
- Moved from current [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) lines 150–166

#### [NEW] `constants/enums.ts`
- `TRUST_LEVELS`, `IDENTITY_MECHANISMS`, `AUTHORIZATION_MODELS` arrays
- `NODE_TYPE_SUGGESTIONS`, `PROTOCOL_SUGGESTIONS` arrays
- Currently scattered across [NodeEditor.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/NodeEditor.tsx) and [EdgeEditor.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/EdgeEditor.tsx)

---

### `api/` — Backend communication

#### [NEW] `api/analyze.ts`
- `const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000"`
- `fetchSample(): Promise<{document: string, format: string}>` — GET `/api/v1/sample`
- `analyzeArchitecture(arch: ArchitectureDocument): Promise<AnalysisResponse>` — POST `/api/v1/analyze`
- Extracted from [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) [handleAnalyze()](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx#359-385) and [handleLoadSample()](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx#316-324)

---

### `utils/` — Pure functions

#### [NEW] `utils/clone.ts`
- `clone<T>(value: T): T` — via `structuredClone` or JSON round-trip
- From [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) line 559

#### [NEW] `utils/ids.ts`
- [createNodeId(arch)](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx#563-569), [createNodeIdFromBase(arch, baseId)](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx#570-580), [createLabelFromBase(baseLabel, nextId, baseId)](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx#581-586)
- From [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) lines 563–585

#### [NEW] `utils/buildGraph.ts`
- [buildGraph(arch, positions)](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx#533-558) → `{ nodes: GraphNode[], edges: GraphEdge[] }`
- From [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) lines 533–557

---

### `hooks/` — State management

#### [NEW] `hooks/useArchitecture.ts`
Returns: `{ architecture, positions, setArchitecture, addNode, updateNode, deleteNode, addEdge, updateEdge, deleteEdge, handleNodeMove, loadSample, importArchitecture }`
- Owns `architecture: ArchitectureDocument` state
- Owns `positions: Record<string, {x,y}>` state
- Contains all mutation logic currently in [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) (handleAddNode, updateNode, deleteNode, etc.)

#### [NEW] `hooks/useSelection.ts`
Returns: `{ selectedNodeId, selectedEdgeKey, selectNode, selectEdge, deselectAll }`
- Owns which node/edge is currently selected
- Extracted from [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) state + handlers (lines 182–196)

#### [NEW] `hooks/useAnalysis.ts`
Returns: `{ analysis, loading, error, analyze }`
- Calls `analyzeArchitecture()` from `api/analyze.ts`
- Manages `loading`, `error`, `response` state
- Extracted from [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) [handleAnalyze()](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx#359-385) (lines 359–384)

---

### `components/` — React components

#### [NEW] `components/App.tsx`
- Thin shell: calls the 3 hooks, wires everything together
- Layout: `<GraphToolbar>` on top, `<GraphCanvas>` in center, inspector on right, `<FindingsPanel>` below
- **No business logic** — just passes hook returns to child props

#### [MODIFY] `components/GraphCanvas.tsx`
- Same Cytoscape logic as current [GraphCanvas.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/GraphCanvas.tsx)
- Cleaner: imports types from `types/graph.ts` instead of `./types`
- No functional changes

#### [MODIFY] `components/GraphToolbar.tsx`
- Same toolbar UI, but the import modal is extracted to `<ImportModal>`
- Smaller file

#### [NEW] `components/ImportModal.tsx`
- The import overlay (paste / file browse), extracted from [GraphToolbar.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/GraphToolbar.tsx) lines 115–142
- Props: `onImport`, `onClose`

#### [MODIFY] `components/NodeEditor.tsx`
- Same inspector UI
- Imports enums from `constants/enums.ts`

#### [MODIFY] `components/EdgeEditor.tsx`
- Same inspector UI
- Imports enums from `constants/enums.ts`

#### [NEW] `components/FindingsPanel.tsx`
- Summary cards row + findings accordion sections
- Extracted from [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) JSX (~lines 430–498)
- Uses `<SummaryCard>` and `<FindingsSection>` sub-components

#### [NEW] `components/SummaryCard.tsx`
- Extracted from [App.tsx](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx) [SummaryCard](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/src/App.tsx#503-506) component (lines 503–505)

---

### `styles/` — Split CSS

#### [NEW] `styles/index.css`
- CSS variables (colors, fonts, spacings)
- Global reset, body, `#root` layout

#### [NEW] `styles/toolbar.css`
- `.graph-toolbar-bar`, `.toolbar-btn`, `.toolbar-badge`, `.toolbar-select-group`, `.edge-builder`

#### [NEW] `styles/canvas.css`
- `.graph-canvas-container`

#### [NEW] `styles/inspector.css`
- `.inspector-panel`, `.inspector-header`, `.inspector-body`, `.editor-grid`, `.check-pill`

#### [NEW] `styles/findings.css`
- `.summary-row`, `.summary-card`, `.findings-section`

#### [NEW] `styles/modal.css`
- `.import-overlay`, `.import-modal`, `.import-textarea`, `.import-actions`

---

## Config Files (no changes)

| File | Action |
|------|--------|
| [package.json](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/package.json) | No changes |
| [tsconfig.json](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/tsconfig.json) | No changes |
| [vite.config.ts](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/vite.config.ts) | No changes |
| [index.html](file:///d:/Extras/Trust-Boundary-Visualizer/frontend/index.html) | No changes |

---

## Verification Plan

### Automated
1. **TypeScript compilation**: `cd frontend && npx tsc --noEmit` — must pass with zero errors
2. **Vite build**: `cd frontend && npm run build` — must produce `dist/` successfully

### Manual (user)
1. Run `npm run dev` in `frontend/`
2. Open `http://localhost:5173`
3. Click **Sample** → graph should render with 5 nodes
4. Click a node → Node Inspector should open on the right
5. Click an edge → Edge Inspector should open
6. Click **Analyze** → findings panel should appear below the graph
7. Click **Import** → modal should open, paste YAML, verify it loads
8. Add a node from the toolbar dropdown → it should appear on the canvas

> [!IMPORTANT]
> This is a **pure refactor** — zero new features, zero visual changes. Every interaction and visual should behave identically to the current version. The goal is clean file separation so you can see exactly where each piece of code belongs.
