"""
Pydantic models for AIP data structures
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


class Capability(BaseModel):
    """Agent capability definition"""

    skill: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
    parameters: Optional[Dict[str, Any]] = None


class Pricing(BaseModel):
    """Pricing information"""

    model: Literal["free", "per-task", "subscription", "custom"]
    base_price: Optional[float] = None
    currency: Optional[str] = None


class Endpoints(BaseModel):
    """API endpoints"""

    api: Optional[str] = None
    health: Optional[str] = None
    docs: Optional[str] = None


class Metrics(BaseModel):
    """Performance metrics"""

    tasks_completed: Optional[int] = Field(None, ge=0)
    avg_response_time_ms: Optional[int] = Field(None, ge=0)
    success_rate: Optional[float] = Field(None, ge=0.0, le=1.0)
    uptime_30d: Optional[float] = Field(None, ge=0.0, le=1.0)


class ProofOfWork(BaseModel):
    """Proof of work references"""

    type: Literal["ipfs", "blockchain", "signed", "custom"]
    references: List[str]


class AgentProfile(BaseModel):
    """Complete agent profile"""

    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=100)
    version: str = Field(..., pattern=r"^\d+\.\d+\.\d+")
    capabilities: List[Capability] = Field(..., min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    endpoints: Optional[Endpoints] = None
    pricing: Optional[Pricing] = None
    metrics: Optional[Metrics] = None
    metadata: Optional[Dict[str, Any]] = None
    proof_of_work: Optional[ProofOfWork] = None

    @field_validator("version")
    @classmethod
    def validate_version(cls, v: str) -> str:
        """Validate semver format"""
        parts = v.split(".")
        if len(parts) < 3:
            raise ValueError("Version must follow semver format (e.g., 1.0.0)")
        return v


class SearchResponse(BaseModel):
    """Search response from registry"""

    results: List[AgentProfile]
    total: int
    page: int
    per_page: int = 20


class RegistrationResponse(BaseModel):
    """Registration response"""

    id: str
    registered_at: str


class UpdateResponse(BaseModel):
    """Update response"""

    updated_at: str


class MetricsReportResponse(BaseModel):
    """Metrics report response"""

    recorded_at: str


class APIError(BaseModel):
    """API error response"""

    error: str
    code: Optional[str] = None
    details: Optional[Any] = None
