"""
AIP CLI - Main command-line interface
"""

import click
import json
import yaml
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint
from aip import AIPClient, create_agent, create_capability, Metrics
from aip.client import AIPClientError

console = Console()


def get_client(registry_url: str, api_key: str = None) -> AIPClient:
    """Get AIP client from config or arguments"""
    return AIPClient(registry_url, api_key)


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """
    AIP CLI - Command-line tools for Agent Identity Protocol

    \b
    Examples:
      aip register agent.yaml
      aip search text-generation
      aip get did:aip:my-agent
      aip delete did:aip:my-agent
    """
    pass


@cli.command()
@click.argument("file", type=click.Path(exists=True))
@click.option("--registry", "-r", default="http://localhost:3000", help="Registry URL")
@click.option("--api-key", "-k", help="API key for authentication")
def register(file, registry, api_key):
    """
    Register an agent from a YAML/JSON file

    \b
    Example agent.yaml:
      id: did:aip:my-agent
      name: MyAgent
      version: 1.0.0
      capabilities:
        - skill: text-generation
          confidence: 0.9
    """
    try:
        # Load profile from file
        with open(file, "r") as f:
            if file.endswith(".yaml") or file.endswith(".yml"):
                data = yaml.safe_load(f)
            else:
                data = json.load(f)

        # Create agent profile
        capabilities = [create_capability(**cap) for cap in data["capabilities"]]
        agent = create_agent(
            id=data["id"],
            name=data["name"],
            capabilities=capabilities,
            version=data.get("version", "1.0.0"),
            description=data.get("description"),
        )

        # Register
        client = get_client(registry, api_key)
        result = client.register(agent)

        rprint(f"[green]✅ Agent registered successfully![/green]")
        rprint(f"   ID: {result.id}")
        rprint(f"   Registered at: {result.registered_at}")

    except AIPClientError as e:
        rprint(f"[red]❌ Registration failed: {e.message}[/red]")
        if e.code:
            rprint(f"   Code: {e.code}")
        raise click.Abort()
    except Exception as e:
        rprint(f"[red]❌ Error: {e}[/red]")
        raise click.Abort()


@cli.command()
@click.argument("skill", required=False)
@click.option("--min-confidence", "-c", default=0.7, help="Minimum confidence (0.0-1.0)")
@click.option("--limit", "-l", default=20, help="Maximum results")
@click.option("--registry", "-r", default="http://localhost:3000", help="Registry URL")
@click.option("--api-key", "-k", help="API key for authentication")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def search(skill, min_confidence, limit, registry, api_key, output_json):
    """
    Search for agents by skill

    \b
    Examples:
      aip search text-generation
      aip search --min-confidence 0.9
      aip search --json > results.json
    """
    try:
        client = get_client(registry, api_key)
        agents = client.search(skill=skill, min_confidence=min_confidence, limit=limit)

        if output_json:
            print(json.dumps([a.model_dump() for a in agents], indent=2))
            return

        if not agents:
            rprint("[yellow]No agents found.[/yellow]")
            return

        # Create table
        table = Table(title=f"Found {len(agents)} agent(s)")
        table.add_column("ID", style="cyan")
        table.add_column("Name", style="green")
        table.add_column("Version", style="blue")
        table.add_column("Skills", style="yellow")

        for agent in agents:
            skills = ", ".join(c.skill for c in agent.capabilities)
            table.add_row(agent.id, agent.name, agent.version, skills)

        console.print(table)

    except AIPClientError as e:
        rprint(f"[red]❌ Search failed: {e.message}[/red]")
        raise click.Abort()


@cli.command()
@click.argument("agent_id")
@click.option("--registry", "-r", default="http://localhost:3000", help="Registry URL")
@click.option("--api-key", "-k", help="API key for authentication")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def get(agent_id, registry, api_key, output_json):
    """
    Get an agent profile by ID

    \b
    Example:
      aip get did:aip:my-agent
      aip get did:aip:my-agent --json
    """
    try:
        client = get_client(registry, api_key)
        agent = client.get_agent(agent_id)

        if output_json:
            print(json.dumps(agent.model_dump(), indent=2))
            return

        # Display profile
        panel_content = f"""
[cyan]Name:[/cyan] {agent.name}
[cyan]Version:[/cyan] {agent.version}
[cyan]Description:[/cyan] {agent.description or 'N/A'}

[yellow]Capabilities:[/yellow]
"""
        for cap in agent.capabilities:
            panel_content += f"  • {cap.skill} (confidence: {cap.confidence})\n"

        if agent.metrics:
            panel_content += f"""
[green]Metrics:[/green]
  Tasks completed: {agent.metrics.tasks_completed or 'N/A'}
  Success rate: {agent.metrics.success_rate or 'N/A'}
  Avg response time: {agent.metrics.avg_response_time_ms or 'N/A'}ms
"""

        console.print(Panel(panel_content.strip(), title=f"Agent: {agent.id}", expand=False))

    except AIPClientError as e:
        rprint(f"[red]❌ Failed: {e.message}[/red]")
        raise click.Abort()


@cli.command()
@click.argument("agent_id")
@click.option("--registry", "-r", default="http://localhost:3000", help="Registry URL")
@click.option("--api-key", "-k", help="API key for authentication")
@click.confirmation_option(prompt="Are you sure you want to delete this agent?")
def delete(agent_id, registry, api_key):
    """
    Delete an agent from the registry

    \b
    Example:
      aip delete did:aip:my-agent
    """
    try:
        client = get_client(registry, api_key)
        client.delete(agent_id)
        rprint(f"[green]✅ Agent deleted successfully![/green]")

    except AIPClientError as e:
        rprint(f"[red]❌ Deletion failed: {e.message}[/red]")
        raise click.Abort()


@cli.command()
@click.argument("agent_id")
@click.option("--tasks", type=int, help="Tasks completed")
@click.option("--response-time", type=int, help="Avg response time (ms)")
@click.option("--success-rate", type=float, help="Success rate (0.0-1.0)")
@click.option("--uptime", type=float, help="Uptime in last 30 days (0.0-1.0)")
@click.option("--registry", "-r", default="http://localhost:3000", help="Registry URL")
@click.option("--api-key", "-k", help="API key for authentication")
def metrics(agent_id, tasks, response_time, success_rate, uptime, registry, api_key):
    """
    Report metrics for an agent

    \b
    Example:
      aip metrics did:aip:my-agent --tasks 100 --success-rate 0.98
    """
    try:
        metrics_data = Metrics(
            tasks_completed=tasks,
            avg_response_time_ms=response_time,
            success_rate=success_rate,
            uptime_30d=uptime,
        )

        client = get_client(registry, api_key)
        result = client.report_metrics(agent_id, metrics_data)

        rprint(f"[green]✅ Metrics reported successfully![/green]")
        rprint(f"   Recorded at: {result.recorded_at}")

    except AIPClientError as e:
        rprint(f"[red]❌ Failed: {e.message}[/red]")
        raise click.Abort()


if __name__ == "__main__":
    cli()
