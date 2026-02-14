# Agent Identity Protocol - Python SDK

Python client library for the Agent Identity Protocol (AIP).

## Installation

```bash
pip install agent-identity-protocol
```

## Quick Start

```python
from aip import AIPClient, create_agent, create_capability

# Create a client
client = AIPClient("http://localhost:3000")

# Create an agent profile
my_agent = create_agent(
    id="did:aip:my-agent",
    name="MyAgent",
    capabilities=[
        create_capability("text-generation", confidence=0.9)
    ],
    description="A simple text generation agent"
)

# Register the agent
registration = client.register(my_agent)
print(f"✅ Registered! ID: {registration.id}")

# Search for agents
agents = client.search(skill="text-generation", min_confidence=0.8)
print(f"Found {len(agents)} agents")

# Get a specific agent
agent = client.get_agent("did:aip:my-agent")
print(f"Agent: {agent.name} v{agent.version}")

# Report metrics
from aip import Metrics

metrics = Metrics(
    tasks_completed=100,
    avg_response_time_ms=1200,
    success_rate=0.98,
    uptime_30d=0.995
)
client.report_metrics("did:aip:my-agent", metrics)
print("✅ Metrics reported!")
```

## Features

- ✅ Full type hints (Pydantic models)
- ✅ Context manager support
- ✅ Comprehensive error handling
- ✅ Async support (coming soon)

## API Reference

### AIPClient

```python
AIPClient(registry_url: str, api_key: Optional[str] = None, timeout: int = 30)
```

#### Methods

- `register(profile: AgentProfile) -> RegistrationResponse`
- `get_agent(agent_id: str) -> AgentProfile`
- `search(skill: str = None, min_confidence: float = 0.7, limit: int = 20) -> List[AgentProfile]`
- `update(agent_id: str, profile: AgentProfile) -> UpdateResponse`
- `delete(agent_id: str) -> None`
- `report_metrics(agent_id: str, metrics: Metrics) -> MetricsReportResponse`

### Helper Functions

```python
create_agent(
    id: str,
    name: str,
    capabilities: List[Capability],
    version: str = "1.0.0",
    **kwargs
) -> AgentProfile
```

```python
create_capability(
    skill: str,
    confidence: float = 0.9,
    parameters: Dict[str, Any] = None
) -> Capability
```

## Error Handling

```python
from aip import AIPClient, AIPClientError

client = AIPClient("http://localhost:3000")

try:
    agent = client.get_agent("nonexistent")
except AIPClientError as e:
    print(f"Error: {e.message}")
    print(f"Code: {e.code}")
```

## Context Manager

```python
with AIPClient("http://localhost:3000") as client:
    agents = client.search("text-generation")
    # Session is automatically closed
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type check
mypy aip

# Format code
black aip
ruff check aip
```

## License

MIT
