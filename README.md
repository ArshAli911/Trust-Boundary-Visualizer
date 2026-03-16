# Trust Boundary Visualizer

Trust Boundary Visualizer is a security architecture analysis tool for reasoning about distributed systems as directed graphs. It does not scan for CVEs or runtime vulnerabilities. It models how data and identity move through services, queues, workers, and datastores, then highlights architectural security risks such as trust boundary crossings, identity propagation gaps, and privilege escalation paths.

## What is implemented

- FastAPI backend for JSON/YAML architecture ingestion
- NetworkX graph construction and path analysis
- Trust boundary detection across trust level transitions
- Attack path analysis from untrusted sources to privileged or restricted sinks
- Identity propagation heuristics for dropped or missing authentication context
- Privilege escalation pattern detection for workers, queues, control-plane access, and restricted data stores
- React + TypeScript frontend with Cytoscape.js visualization
- Structured report output for attack chains and recommendations

## Project layout

- [backend/app/main.py](/D:/Extras/Project/Trust-Boundary-Visualizer/backend/app/main.py)
- [backend/app/analysis.py](/D:/Extras/Project/Trust-Boundary-Visualizer/backend/app/analysis.py)
- [backend/app/models.py](/D:/Extras/Project/Trust-Boundary-Visualizer/backend/app/models.py)
- [frontend/src/App.tsx](/D:/Extras/Project/Trust-Boundary-Visualizer/frontend/src/App.tsx)
- [frontend/src/GraphCanvas.tsx](/D:/Extras/Project/Trust-Boundary-Visualizer/frontend/src/GraphCanvas.tsx)
- [examples/sample-architecture.yaml](/D:/Extras/Project/Trust-Boundary-Visualizer/examples/sample-architecture.yaml)

## Architecture model

The backend accepts either JSON or YAML with this shape:

```yaml
nodes:
  - id: gateway
    type: api_gateway
    trust_level: external
    exposes_public_endpoint: true
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
```

Supported trust levels:

- `external`
- `internal`
- `privileged`
- `restricted`

Supported identity hints:

- `jwt`
- `mtls`
- `api_key`
- `service_account`

## Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API endpoints:

- `GET /api/v1/health`
- `GET /api/v1/sample`
- `POST /api/v1/analyze`

Example request:

```json
{
  "document": "nodes:\n  - id: gateway\n    type: api_gateway\n    trust_level: external\nedges: []",
  "format": "yaml"
}
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000` by default. Override with `VITE_API_BASE` if needed.

## Analysis behavior

The current implementation is heuristic and architecture-focused:

- It flags every edge where trust level changes.
- It identifies shortest paths from untrusted entry points to privileged or restricted components.
- It marks identity risks where identity is dropped or sensitive targets lack explicit authentication.
- It highlights escalation patterns such as queue-to-worker transitions and paths into restricted datastores.

This is intentionally not a scanner. Findings are prompts for security review, not proof of exploitability.
