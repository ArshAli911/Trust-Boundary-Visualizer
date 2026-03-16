from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from .analysis import analyze_architecture
from .models import AnalysisResponse, AnalyzeRequest
from .parser import parse_architecture

SAMPLE_ARCHITECTURE = """nodes:
  - id: gateway
    type: api_gateway
    trust_level: external
    exposes_public_endpoint: true
  - id: auth
    type: auth_service
    trust_level: internal
    auth: jwt
    authorization: role_based
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
    to: auth
    protocol: https
  - from: auth
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
"""

app = FastAPI(
    title="Trust Boundary Visualizer API",
    version="0.1.0",
    description="Architectural security reasoning for distributed systems.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/sample")
def sample_architecture() -> dict[str, str]:
    return {"document": SAMPLE_ARCHITECTURE, "format": "yaml"}


@app.post("/api/v1/analyze", response_model=AnalysisResponse)
def analyze(request: AnalyzeRequest):
    try:
        architecture = (
            request.architecture
            if request.architecture is not None
            else parse_architecture(request.document or "", request.format)
        )
        return analyze_architecture(architecture)
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
