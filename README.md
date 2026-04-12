# Trust Boundary Visualizer

Trust Boundary Visualizer is a small full-stack project for modeling distributed systems as directed graphs and then reasoning about trust transitions, attack paths, identity propagation issues, and privilege-escalation patterns.

This README is not just a setup guide. It is the project map and the working contract for how changes should be made in this repository.

## Repository Structure

Source files currently present in the repository:

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
|       `-- test_analysis.py
|-- examples/
|   `-- sample-architecture.yaml
`-- frontend/
    |-- index.html
    |-- package.json
    |-- tsconfig.json
    |-- vite.config.ts
    `-- src/
        |-- App.tsx
        |-- GraphCanvas.tsx
        |-- main.tsx
        |-- styles.css
        |-- types.ts
        `-- vite-env.d.ts
```

Non-source temporary pytest cache folders may appear under `backend/`, but they are runtime artifacts, not part of the intended source structure.

## What Each Part Does

### Backend

- `backend/app/main.py`
  - Owns the FastAPI app.
  - Exposes:
    - `GET /api/v1/health`
    - `GET /api/v1/sample`
    - `POST /api/v1/analyze`
  - This is the API boundary. It accepts user input, parses or validates it, then hands it to the analysis layer.

- `backend/app/models.py`
  - Defines the schema for nodes, edges, requests, findings, summary objects, and graph output.
  - This file matters because the entire backend contract is centralized here. If the schema changes, both validation and frontend typing expectations change.

- `backend/app/parser.py`
  - Converts YAML or JSON text into an `ArchitectureDocument`.
  - This is kept separate from `main.py` so parsing logic stays reusable and testable.

- `backend/app/analysis.py`
  - Builds a directed graph with NetworkX.
  - Runs the actual trust-boundary and attack-path heuristics.
  - Produces the report and graph view consumed by the frontend.
  - This is the core business logic of the repository.

- `backend/tests/test_analysis.py`
  - Smoke test for the analysis pipeline.
  - Verifies that a minimal architecture produces attack-path, identity, and escalation findings.

### Frontend

- `frontend/src/main.tsx`
  - React entry point.
  - Mounts the app and loads the global stylesheet.

- `frontend/src/App.tsx`
  - Main UI container.
  - Fetches the sample architecture.
  - Sends the architecture text to the backend.
  - Renders summaries, finding sections, and the graph panel.

- `frontend/src/GraphCanvas.tsx`
  - Adapts backend graph data into Cytoscape elements.
  - Applies graph layout and visual styling.
  - Exists separately because graph rendering is its own concern and should not clutter `App.tsx`.

- `frontend/src/types.ts`
  - TypeScript mirror of the backend response shape.
  - Helps catch backend/frontend drift early during build time.

- `frontend/src/styles.css`
  - Defines the entire visual system: page layout, panels, graph canvas, findings cards, and responsive behavior.

### Example and Tooling Files

- `examples/sample-architecture.yaml`
  - Example architecture document for manual testing.

- `backend/requirements.txt`
  - Python dependencies: FastAPI, Pydantic, NetworkX, PyYAML, Uvicorn, pytest.

- `backend/pytest.ini`
  - Local pytest configuration.

- `frontend/package.json`
  - Frontend scripts and dependencies.

- `frontend/vite.config.ts`
  - Vite development server configuration.

- `frontend/tsconfig.json`
  - TypeScript compiler configuration.

- `frontend/index.html`
  - Vite HTML shell.

- `frontend/src/vite-env.d.ts`
  - Vite TypeScript environment declarations.

## Request Flow

The current execution path is simple and important to understand:

1. The user edits architecture text in `frontend/src/App.tsx`.
2. `handleAnalyze()` posts `{ document, format }` to `POST /api/v1/analyze`.
3. `backend/app/main.py` receives the request.
4. `parse_architecture()` in `backend/app/parser.py` converts YAML or JSON into an `ArchitectureDocument` when raw text is provided.
5. `analyze_architecture()` in `backend/app/analysis.py` builds the graph, runs all detection functions, and assembles the response.
6. The frontend receives the `AnalysisResponse`.
7. `GraphCanvas.tsx` renders the graph, and `App.tsx` renders summaries and findings.

## Functions Chosen and Why

The backend is intentionally split into small functions. That is the correct choice for this project because each detection rule is a separate heuristic and should remain independently understandable.

### `backend/app/main.py`

- `health_check()`
  - Chosen to provide a minimal readiness endpoint.
  - Reason: separates deployment health from application analysis behavior.

- `sample_architecture()`
  - Chosen to provide a known-good document for the frontend.
  - Reason: removes the need to hardcode the only sample in the client.

- `analyze(request)`
  - Chosen as the single API entry for analysis.
  - Reason: keeps parsing, validation, and analysis behind one stable endpoint.

### `backend/app/parser.py`

- `parse_architecture(document, format_hint)`
  - Chosen to normalize YAML/JSON input into one internal object model.
  - Reason: parsing is a separate responsibility from API routing and graph analysis.

### `backend/app/analysis.py`

- `build_graph(architecture)`
  - Chosen to convert validated models into a NetworkX directed graph.
  - Reason: the rest of the analysis becomes much simpler once the system is represented as a graph.

- `analyze_architecture(architecture)`
  - Chosen as the orchestration function.
  - Reason: there needs to be one place that runs all heuristics and assembles the final response.

- `detect_trust_boundaries(graph)`
  - Chosen to scan edges crossing trust levels.
  - Reason: trust transitions are the base security signal in this project.

- `detect_attack_paths(graph)`
  - Chosen to find shortest routes from untrusted entry points to sensitive sinks.
  - Reason: path-based reasoning is stronger than edge-only reasoning for architecture review.

- `detect_identity_findings(graph)`
  - Chosen to detect dropped or missing identity at inward trust transitions.
  - Reason: identity propagation mistakes are a common architectural weakness.

- `detect_privilege_escalations(graph, attack_paths)`
  - Chosen to add special-case escalation heuristics on top of generic path analysis.
  - Reason: some routes are materially worse than others, especially queues, workers, control planes, and restricted datastores.

- `build_report(...)`
  - Chosen to flatten multiple finding types into one report list.
  - Reason: the UI needs a readable, user-facing report format separate from raw findings.

- `build_graph_view(...)`
  - Chosen to create a frontend-ready graph payload with styling flags.
  - Reason: the UI should not have to recompute analysis semantics from raw backend models.

- `classify_boundary_severity(source, target)`
  - Chosen to centralize boundary severity logic.
  - Reason: trust-delta rules should not be duplicated inside detection loops.

- `find_untrusted_sources(graph)`
  - Chosen to identify graph entry points for attack-path analysis.
  - Reason: path search needs a stable definition of where untrusted input begins.

- `path_crosses_boundary(path_levels)`
  - Chosen to ignore paths that never move inward across trust.
  - Reason: not every path to a sink is a trust-boundary issue.

- `recommend_for_sink(node_type, sink_level)`
  - Chosen to attach basic remediation guidance based on the target reached.
  - Reason: findings are more useful when they include an action, not just a warning.

- `dedupe_paths(findings)`
  - Chosen to avoid repeated path findings.
  - Reason: shortest-path analysis and multi-rule detection can otherwise generate noisy duplicates.

- `dedupe_escalations(findings)`
  - Chosen to avoid repeated escalation findings.
  - Reason: escalation heuristics overlap by design and need a cleanup pass.

### `frontend/src/App.tsx`

- `App()`
  - Chosen as the single stateful page component.
  - Reason: the app is still small enough that one top-level container keeps the flow easy to follow.

- `handleAnalyze(event)`
  - Chosen to isolate the submit behavior.
  - Reason: async request handling should stay out of JSX markup.

- `SummaryCard(...)`
  - Chosen as a small presentational helper.
  - Reason: repeated summary markup should not be duplicated inline.

- `FindingsSection(...)`
  - Chosen as a reusable renderer for attack paths, boundaries, identity findings, escalation findings, and report entries.
  - Reason: the UI repeats the same list/card pattern several times.

### `frontend/src/GraphCanvas.tsx`

- `GraphCanvas({ nodes, edges })`
  - Chosen as a dedicated graph renderer.
  - Reason: Cytoscape instance lifecycle and styling are specialized enough to warrant their own component.

## Why These Design Choices Make Sense

- FastAPI is a good fit because the backend is schema-heavy and endpoint-light.
- Pydantic is the right choice because the project lives on structured architecture documents.
- NetworkX is the right choice because path and graph reasoning are central to the product.
- React plus Vite is sufficient because the frontend is a single interactive page, not a large app shell.
- Cytoscape is appropriate because the output is graph-native, not table-native.

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

Default frontend API target:

```text
http://localhost:8000
```

Override with `VITE_API_BASE` if needed.

## Working Mode For This Project

This repository now follows a strict learning-first workflow.

When you ask for a feature, refactor, bug fix, or test update in this project, you should write the code first.

### The rule

1. You propose the code change.
2. I review your code against the current repository.
3. If your code is correct, I implement it or help integrate it.
4. If your code is wrong, incomplete, or inconsistent with the project structure, I do not implement it.
5. Instead, I tell you exactly where you are wrong, point you to the relevant file or function, and tell you to try again.

### What counts as a valid first attempt

- A concrete code block.
- A patch or diff.
- A specific function rewrite.
- A specific component change.
- A test you want added or updated.

What does not count:

- "Please implement X."
- "Do it for me."
- Vague feature descriptions without code.

### What I will check before accepting your code

- Does it match the current backend and frontend data flow?
- Does it preserve the schema in `backend/app/models.py` and `frontend/src/types.ts`?
- Does it fit the existing separation of concerns?
- Does it break current analysis behavior?
- Does it need tests?

### How I will respond

- If correct: I will implement or refine it.
- If wrong: I will tell you the exact mistake and ask you to try again.

Use this as the standing contract for collaboration in this repository.

## Current Gaps You Should Know

- There is only one backend test, so regression coverage is still thin.
- The frontend types do not currently include the full `architecture` object returned by the backend.
- The analysis engine is heuristic. It is useful for architecture review, but it is not proof of exploitability.
