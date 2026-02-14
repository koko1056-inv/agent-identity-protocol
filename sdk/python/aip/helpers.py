"""
Helper functions for creating AIP data structures
"""

from typing import Any, Dict, List, Optional
from .models import AgentProfile, Capability, Pricing, Endpoints


def create_capability(
    skill: str,
    confidence: float = 0.9,
    parameters: Optional[Dict[str, Any]] = None,
) -> Capability:
    """
    Create a capability

    Args:
        skill: Skill identifier
        confidence: Confidence level (default 0.9)
        parameters: Optional capability parameters

    Returns:
        Capability object
    """
    return Capability(
        skill=skill,
        confidence=confidence,
        parameters=parameters,
    )


def create_agent(
    id: str,
    name: str,
    capabilities: List[Capability],
    version: str = "1.0.0",
    description: Optional[str] = None,
    endpoints: Optional[Endpoints] = None,
    pricing: Optional[Pricing] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> AgentProfile:
    """
    Create an agent profile with minimal required fields

    Args:
        id: Unique agent identifier
        name: Human-readable name
        capabilities: List of capabilities
        version: Semantic version (default "1.0.0")
        description: Optional description
        endpoints: Optional API endpoints
        pricing: Optional pricing information
        metadata: Optional metadata

    Returns:
        Complete agent profile with defaults
    """
    return AgentProfile(
        id=id,
        name=name,
        version=version,
        capabilities=capabilities,
        description=description,
        endpoints=endpoints or Endpoints(),
        pricing=pricing or Pricing(model="free"),
        metadata=metadata or {},
    )
