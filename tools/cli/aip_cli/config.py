"""
Configuration management for AIP CLI
"""

import os
import yaml
from pathlib import Path
from typing import Optional
from dataclasses import dataclass


@dataclass
class AIPConfig:
    """AIP CLI configuration"""

    registry_url: str = "http://localhost:3000"
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3

    @classmethod
    def from_file(cls, config_path: Path) -> "AIPConfig":
        """Load configuration from file"""
        if not config_path.exists():
            return cls()

        with open(config_path, "r") as f:
            data = yaml.safe_load(f)

        return cls(
            registry_url=data.get("registry_url", "http://localhost:3000"),
            api_key=data.get("api_key"),
            timeout=data.get("timeout", 30),
            max_retries=data.get("max_retries", 3),
        )

    def save(self, config_path: Path):
        """Save configuration to file"""
        config_path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "registry_url": self.registry_url,
            "timeout": self.timeout,
            "max_retries": self.max_retries,
        }

        if self.api_key:
            data["api_key"] = self.api_key

        with open(config_path, "w") as f:
            yaml.safe_dump(data, f, default_flow_style=False)


def get_config_path() -> Path:
    """Get configuration file path"""
    # Check environment variable first
    if config_env := os.getenv("AIP_CONFIG"):
        return Path(config_env)

    # Default to ~/.aip/config.yaml
    return Path.home() / ".aip" / "config.yaml"


def load_config() -> AIPConfig:
    """Load configuration from default location"""
    config_path = get_config_path()
    return AIPConfig.from_file(config_path)


def save_config(config: AIPConfig):
    """Save configuration to default location"""
    config_path = get_config_path()
    config.save(config_path)
