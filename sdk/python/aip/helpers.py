"""
Helper functions for AIP SDK
"""

import json
import yaml
from pathlib import Path
from typing import Union, List, Dict, Any
from .models import AgentProfile, Capability, Endpoints, Pricing, ProofOfWork, Metrics


def load_agent_from_file(file_path: Union[str, Path]) -> AgentProfile:
    """
    Load an agent profile from a YAML or JSON file

    Args:
        file_path: Path to YAML or JSON file

    Returns:
        AgentProfile instance

    Raises:
        ValueError: If file format is unsupported or invalid

    Example:
        >>> agent = load_agent_from_file("agent.yaml")
        >>> client.register(agent)
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        if file_path.suffix in [".yaml", ".yml"]:
            data = yaml.safe_load(f)
        elif file_path.suffix == ".json":
            data = json.load(f)
        else:
            raise ValueError(f"Unsupported file format: {file_path.suffix}")

    return AgentProfile(**data)


def save_agent_to_file(agent: AgentProfile, file_path: Union[str, Path], format: str = "yaml"):
    """
    Save an agent profile to a file

    Args:
        agent: AgentProfile instance
        file_path: Output file path
        format: Output format ("yaml" or "json")

    Example:
        >>> save_agent_to_file(agent, "agent.yaml")
    """
    file_path = Path(file_path)
    data = agent.model_dump(exclude_none=True)

    with open(file_path, "w", encoding="utf-8") as f:
        if format == "yaml":
            yaml.safe_dump(data, f, default_flow_style=False, sort_keys=False)
        elif format == "json":
            json.dump(data, f, indent=2)
        else:
            raise ValueError(f"Unsupported format: {format}")


def create_capability(
    skill: str,
    confidence: float = 1.0,
    parameters: Dict[str, Any] = None,
) -> Capability:
    """
    Create a capability entry

    Args:
        skill: Skill identifier (e.g., "text-generation")
        confidence: Confidence level (0.0 - 1.0)
        parameters: Optional skill-specific parameters

    Returns:
        Capability instance
    """
    return Capability(skill=skill, confidence=confidence, parameters=parameters)


def create_agent(
    id: str,
    name: str,
    capabilities: List[Capability],
    version: str = "1.0.0",
    description: str = None,
    endpoints: Endpoints = None,
    pricing: Pricing = None,
    metrics: Metrics = None,
    metadata: Dict[str, Any] = None,
    proof_of_work: ProofOfWork = None,
) -> AgentProfile:
    """
    Create an agent profile

    Args:
        id: Unique agent identifier (e.g., "did:aip:my-agent")
        name: Human-readable name
        capabilities: List of capabilities
        version: Semantic version (default: "1.0.0")
        description: Optional description
        endpoints: API endpoints
        pricing: Pricing information
        metrics: Performance metrics
        metadata: Additional metadata
        proof_of_work: Proof of work references

    Returns:
        AgentProfile instance

    Example:
        >>> agent = create_agent(
        ...     id="did:aip:my-agent",
        ...     name="MyAgent",
        ...     capabilities=[create_capability("text-generation", 0.9)],
        ... )
    """
    return AgentProfile(
        id=id,
        name=name,
        version=version,
        capabilities=capabilities,
        description=description,
        endpoints=endpoints,
        pricing=pricing,
        metrics=metrics,
        metadata=metadata,
        proof_of_work=proof_of_work,
    )


def batch_register(client, profiles: List[AgentProfile]) -> Dict[str, Any]:
    """
    Register multiple agents in batch

    Args:
        client: AIPClient instance
        profiles: List of AgentProfile instances

    Returns:
        Dictionary with success/failure counts and details

    Example:
        >>> agents = [load_agent_from_file(f) for f in ["a1.yaml", "a2.yaml"]]
        >>> result = batch_register(client, agents)
        >>> print(f"Registered: {result['success']}, Failed: {result['failed']}")
    """
    results = {"success": 0, "failed": 0, "errors": []}

    for profile in profiles:
        try:
            client.register(profile)
            results["success"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({"id": profile.id, "error": str(e)})

    return results


def batch_delete(client, agent_ids: List[str]) -> Dict[str, Any]:
    """
    Delete multiple agents in batch

    Args:
        client: AIPClient instance
        agent_ids: List of agent IDs to delete

    Returns:
        Dictionary with success/failure counts and details

    Example:
        >>> result = batch_delete(client, ["did:aip:agent1", "did:aip:agent2"])
    """
    results = {"success": 0, "failed": 0, "errors": []}

    for agent_id in agent_ids:
        try:
            client.delete(agent_id)
            results["success"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({"id": agent_id, "error": str(e)})

    return results


def filter_agents_by_skill(
    agents: List[AgentProfile],
    skill: str,
    min_confidence: float = 0.7,
) -> List[AgentProfile]:
    """
    Filter agents by skill and confidence

    Args:
        agents: List of AgentProfile instances
        skill: Skill to filter by
        min_confidence: Minimum confidence threshold

    Returns:
        Filtered list of agents
    """
    return [
        agent
        for agent in agents
        if any(
            cap.skill == skill and cap.confidence >= min_confidence for cap in agent.capabilities
        )
    ]


def sort_agents_by_metrics(
    agents: List[AgentProfile],
    key: str = "success_rate",
    reverse: bool = True,
) -> List[AgentProfile]:
    """
    Sort agents by metrics

    Args:
        agents: List of AgentProfile instances
        key: Metric key to sort by ("success_rate", "tasks_completed", etc.)
        reverse: Sort descending (default: True)

    Returns:
        Sorted list of agents
    """

    def get_metric(agent: AgentProfile):
        if not agent.metrics:
            return 0
        return getattr(agent.metrics, key, 0) or 0

    return sorted(agents, key=get_metric, reverse=reverse)
