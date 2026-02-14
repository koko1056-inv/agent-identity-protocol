"""
AIP CLI - Enhanced command-line interface with config support and batch operations
"""

import click
import json
import yaml
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress
from rich import print as rprint
from aip import AIPClient, Metrics
from aip.helpers import (
    load_agent_from_file,
    save_agent_to_file,
    batch_register,
    batch_delete,
    create_capability,
    create_agent,
)
from aip.client import AIPClientError
from .config import load_config, save_config, AIPConfig

console = Console()


def get_client(
    registry_url: str = None,
    api_key: str = None,
    use_config: bool = True,
) -> AIPClient:
    """Get AIP client from config or arguments"""
    if use_config:
        config = load_config()
        registry_url = registry_url or config.registry_url
        api_key = api_key or config.api_key
        max_retries = config.max_retries
        timeout = config.timeout
    else:
        registry_url = registry_url or "http://localhost:3000"
        max_retries = 3
        timeout = 30

    return AIPClient(
        registry_url=registry_url,
        api_key=api_key,
        timeout=timeout,
        max_retries=max_retries,
    )


@click.group()
@click.version_option(version="0.3.0")
def cli():
    """
    AIP CLI - Command-line tools for Agent Identity Protocol

    \b
    Configuration:
      Set defaults in ~/.aip/config.yaml or use --registry and --api-key flags.

    \b
    Examples:
      aip config set registry https://registry.example.com
      aip register agent.yaml
      aip search text-generation
      aip batch-register agents/*.yaml
    """
    pass


# ============= CONFIG COMMANDS =============


@cli.group()
def config():
    """Manage AIP CLI configuration"""
    pass


# ============= API KEY COMMANDS =============


@cli.group(name="keys")
def api_keys():
    """Manage API keys"""
    pass


@config.command(name="set")
@click.argument("key")
@click.argument("value")
def config_set(key, value):
    """
    Set configuration value

    \b
    Examples:
      aip config set registry https://registry.example.com
      aip config set api_key sk-...
      aip config set timeout 60
    """
    cfg = load_config()

    if key == "registry":
        cfg.registry_url = value
    elif key == "api_key":
        cfg.api_key = value
    elif key == "timeout":
        cfg.timeout = int(value)
    elif key == "max_retries":
        cfg.max_retries = int(value)
    else:
        rprint(f"[red]❌ Unknown config key: {key}[/red]")
        raise click.Abort()

    save_config(cfg)
    rprint(f"[green]✅ Configuration updated: {key} = {value}[/green]")


@config.command(name="get")
@click.argument("key", required=False)
def config_get(key):
    """
    Get configuration value(s)

    \b
    Examples:
      aip config get
      aip config get registry
    """
    cfg = load_config()

    if key:
        value = getattr(cfg, key.replace("-", "_"), None)
        if value is None:
            rprint(f"[yellow]Config key '{key}' not set[/yellow]")
        else:
            rprint(f"{key}: {value}")
    else:
        rprint("[cyan]Current Configuration:[/cyan]")
        rprint(f"  registry_url: {cfg.registry_url}")
        rprint(f"  api_key: {'***' if cfg.api_key else 'not set'}")
        rprint(f"  timeout: {cfg.timeout}")
        rprint(f"  max_retries: {cfg.max_retries}")


# ============= AGENT COMMANDS =============


@cli.command()
@click.argument("file", type=click.Path(exists=True))
@click.option("--registry", "-r", help="Registry URL (overrides config)")
@click.option("--api-key", "-k", help="API key (overrides config)")
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
        agent = load_agent_from_file(file)
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
@click.argument("pattern")
@click.option("--registry", "-r", help="Registry URL")
@click.option("--api-key", "-k", help="API key")
def batch_register_cmd(pattern, registry, api_key):
    """
    Register multiple agents from files matching a pattern

    \b
    Examples:
      aip batch-register "agents/*.yaml"
      aip batch-register "*.json"
    """
    files = list(Path().glob(pattern))

    if not files:
        rprint(f"[yellow]No files matching pattern: {pattern}[/yellow]")
        return

    rprint(f"[cyan]Found {len(files)} file(s) to register[/cyan]")

    agents = []
    for file in files:
        try:
            agent = load_agent_from_file(file)
            agents.append(agent)
        except Exception as e:
            rprint(f"[red]❌ Failed to load {file}: {e}[/red]")

    if not agents:
        rprint("[red]No valid agent profiles found[/red]")
        return

    client = get_client(registry, api_key)

    with Progress() as progress:
        task = progress.add_task("[cyan]Registering agents...", total=len(agents))

        result = {"success": 0, "failed": 0, "errors": []}
        for agent in agents:
            try:
                client.register(agent)
                result["success"] += 1
            except Exception as e:
                result["failed"] += 1
                result["errors"].append({"id": agent.id, "error": str(e)})
            progress.update(task, advance=1)

    rprint(f"\n[green]✅ Registered: {result['success']}[/green]")
    if result["failed"] > 0:
        rprint(f"[red]❌ Failed: {result['failed']}[/red]")
        for err in result["errors"]:
            rprint(f"   - {err['id']}: {err['error']}")


@cli.command()
@click.argument("skill", required=False)
@click.option("--min-confidence", "-c", default=0.7, help="Minimum confidence (0.0-1.0)")
@click.option("--limit", "-l", default=20, help="Maximum results")
@click.option("--all", "fetch_all", is_flag=True, help="Fetch all results (no pagination)")
@click.option("--registry", "-r", help="Registry URL")
@click.option("--api-key", "-k", help="API key")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def search(skill, min_confidence, limit, fetch_all, registry, api_key, output_json):
    """
    Search for agents by skill

    \b
    Examples:
      aip search text-generation
      aip search --min-confidence 0.9
      aip search --all --json > all-agents.json
    """
    try:
        client = get_client(registry, api_key)

        if fetch_all:
            agents = client.search_all(skill=skill, min_confidence=min_confidence)
        else:
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
@click.option("--registry", "-r", help="Registry URL")
@click.option("--api-key", "-k", help="API key")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
@click.option("--save", type=click.Path(), help="Save to file")
def get(agent_id, registry, api_key, output_json, save):
    """
    Get an agent profile by ID

    \b
    Examples:
      aip get did:aip:my-agent
      aip get did:aip:my-agent --save agent.yaml
      aip get did:aip:my-agent --json
    """
    try:
        client = get_client(registry, api_key)
        agent = client.get_agent(agent_id)

        if save:
            save_path = Path(save)
            format = "yaml" if save_path.suffix in [".yaml", ".yml"] else "json"
            save_agent_to_file(agent, save_path, format=format)
            rprint(f"[green]✅ Saved to {save}[/green]")

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
@click.option("--registry", "-r", help="Registry URL")
@click.option("--api-key", "-k", help="API key")
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
@click.argument("agent_ids", nargs=-1)
@click.option("--registry", "-r", help="Registry URL")
@click.option("--api-key", "-k", help="API key")
@click.confirmation_option(prompt="Are you sure you want to delete these agents?")
def batch_delete_cmd(agent_ids, registry, api_key):
    """
    Delete multiple agents

    \b
    Examples:
      aip batch-delete did:aip:agent1 did:aip:agent2
    """
    if not agent_ids:
        rprint("[yellow]No agent IDs provided[/yellow]")
        return

    client = get_client(registry, api_key)
    result = batch_delete(client, list(agent_ids))

    rprint(f"[green]✅ Deleted: {result['success']}[/green]")
    if result["failed"] > 0:
        rprint(f"[red]❌ Failed: {result['failed']}[/red]")
        for err in result["errors"]:
            rprint(f"   - {err['id']}: {err['error']}")


@cli.command()
@click.argument("agent_id")
@click.option("--tasks", type=int, help="Tasks completed")
@click.option("--response-time", type=int, help="Avg response time (ms)")
@click.option("--success-rate", type=float, help="Success rate (0.0-1.0)")
@click.option("--uptime", type=float, help="Uptime in last 30 days (0.0-1.0)")
@click.option("--registry", "-r", help="Registry URL")
@click.option("--api-key", "-k", help="API key")
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


@cli.command()
@click.option("--registry", "-r", help="Registry URL")
@click.option("--api-key", "-k", help="API key")
def health(registry, api_key):
    """
    Check registry health status

    \b
    Example:
      aip health
    """
    try:
        client = get_client(registry, api_key)
        result = client.health_check()

        status_color = "green" if result.get("status") == "healthy" else "red"
        db_color = "green" if result.get("database") == "connected" else "red"

        rprint(f"[{status_color}]Status: {result.get('status')}[/{status_color}]")
        rprint(f"[{db_color}]Database: {result.get('database')}[/{db_color}]")
        rprint(f"Timestamp: {result.get('timestamp')}")

    except AIPClientError as e:
        rprint(f"[red]❌ Health check failed: {e.message}[/red]")
        raise click.Abort()


# Register batch commands with proper names
cli.add_command(batch_register_cmd, name="batch-register")
cli.add_command(batch_delete_cmd, name="batch-delete")


@api_keys.command(name="create")
@click.option("--name", "-n", required=True, help="Key name")
@click.option("--description", "-d", help="Key description")
@click.option("--read", is_flag=True, default=True, help="Grant read permission")
@click.option("--write", is_flag=True, help="Grant write permission")
@click.option("--delete", is_flag=True, help="Grant delete permission")
@click.option("--rate-limit", type=int, help="Rate limit (requests per minute)")
@click.option("--expires", help="Expiration date (ISO format)")
@click.option("--registry", "-r", help="Registry URL")
def create_api_key(name, description, read, write, delete, rate_limit, expires, registry):
    """
    Create a new API key

    \b
    Examples:
      aip keys create --name "my-key" --write
      aip keys create -n "admin-key" --write --delete --rate-limit 1000
    """
    try:
        cfg = load_config()
        registry_url = registry or cfg.registry_url

        import requests

        payload = {
            "name": name,
            "permissions": {
                "read": read,
                "write": write,
                "delete": delete,
            },
        }

        if description:
            payload["description"] = description
        if rate_limit:
            payload["rateLimit"] = rate_limit
        if expires:
            payload["expiresAt"] = expires

        response = requests.post(
            f"{registry_url}/admin/api-keys",
            json=payload,
            timeout=30,
        )

        if not response.ok:
            rprint(f"[red]❌ Failed to create API key: {response.text}[/red]")
            raise click.Abort()

        data = response.json()

        rprint(f"[green]✅ API key created successfully![/green]")
        rprint(f"\n[yellow]⚠️  Save this key - it won't be shown again![/yellow]")
        rprint(f"\n[cyan]Key:[/cyan] {data['key']}")
        rprint(f"[cyan]ID:[/cyan] {data['id']}")
        rprint(f"[cyan]Name:[/cyan] {data['name']}")
        rprint(f"[cyan]Permissions:[/cyan] {data['permissions']}")

    except Exception as e:
        rprint(f"[red]❌ Error: {e}[/red]")
        raise click.Abort()


@api_keys.command(name="list")
@click.option("--registry", "-r", help="Registry URL")
def list_api_keys(registry):
    """
    List all API keys

    \b
    Example:
      aip keys list
    """
    try:
        cfg = load_config()
        registry_url = registry or cfg.registry_url

        import requests

        response = requests.get(
            f"{registry_url}/admin/api-keys",
            timeout=30,
        )

        if not response.ok:
            rprint(f"[red]❌ Failed to list API keys: {response.text}[/red]")
            raise click.Abort()

        data = response.json()
        keys = data.get("apiKeys", [])

        if not keys:
            rprint("[yellow]No API keys found.[/yellow]")
            return

        # Create table
        table = Table(title=f"API Keys ({len(keys)})")
        table.add_column("ID", style="cyan")
        table.add_column("Name", style="green")
        table.add_column("Key Preview", style="yellow")
        table.add_column("Active", style="blue")
        table.add_column("Last Used", style="magenta")

        for key in keys:
            table.add_row(
                key["id"][:8] + "...",
                key["name"],
                key["keyPreview"],
                "✓" if key["isActive"] else "✗",
                key.get("lastUsedAt", "Never")[:19] if key.get("lastUsedAt") else "Never",
            )

        console.print(table)

    except Exception as e:
        rprint(f"[red]❌ Error: {e}[/red]")
        raise click.Abort()


@api_keys.command(name="revoke")
@click.argument("key_id")
@click.option("--registry", "-r", help="Registry URL")
@click.confirmation_option(prompt="Are you sure you want to revoke this API key?")
def revoke_api_key(key_id, registry):
    """
    Revoke (disable) an API key

    \b
    Example:
      aip keys revoke <key-id>
    """
    try:
        cfg = load_config()
        registry_url = registry or cfg.registry_url

        import requests

        response = requests.post(
            f"{registry_url}/admin/api-keys/{key_id}/revoke",
            timeout=30,
        )

        if not response.ok:
            rprint(f"[red]❌ Failed to revoke API key: {response.text}[/red]")
            raise click.Abort()

        rprint(f"[green]✅ API key revoked successfully![/green]")

    except Exception as e:
        rprint(f"[red]❌ Error: {e}[/red]")
        raise click.Abort()


@api_keys.command(name="delete")
@click.argument("key_id")
@click.option("--registry", "-r", help="Registry URL")
@click.confirmation_option(prompt="Are you sure you want to delete this API key?")
def delete_api_key(key_id, registry):
    """
    Permanently delete an API key

    \b
    Example:
      aip keys delete <key-id>
    """
    try:
        cfg = load_config()
        registry_url = registry or cfg.registry_url

        import requests

        response = requests.delete(
            f"{registry_url}/admin/api-keys/{key_id}",
            timeout=30,
        )

        if response.status_code not in [200, 204]:
            rprint(f"[red]❌ Failed to delete API key: {response.text}[/red]")
            raise click.Abort()

        rprint(f"[green]✅ API key deleted successfully![/green]")

    except Exception as e:
        rprint(f"[red]❌ Error: {e}[/red]")
        raise click.Abort()


if __name__ == "__main__":
    cli()
