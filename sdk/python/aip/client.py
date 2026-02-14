"""
AIP Client for interacting with agent registries
Enhanced with retry logic and improved error handling
"""

from typing import List, Optional
import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from .models import (
    AgentProfile,
    Metrics,
    SearchResponse,
    RegistrationResponse,
    UpdateResponse,
    MetricsReportResponse,
    APIError,
)


class AIPClientError(Exception):
    """Base exception for AIP client errors"""

    def __init__(self, message: str, code: Optional[str] = None, details: Optional[any] = None):
        self.message = message
        self.code = code
        self.details = details
        super().__init__(self.message)


class AIPClient:
    """Client for interacting with AIP registries"""

    def __init__(
        self,
        registry_url: str,
        api_key: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
        backoff_factor: float = 0.5,
    ):
        """
        Initialize AIP client with automatic retry logic

        Args:
            registry_url: Base URL of the registry (e.g., "https://registry.aip.dev")
            api_key: Optional API key for authentication (also reads from AIP_API_KEY env var)
            timeout: Request timeout in seconds (default: 30)
            max_retries: Maximum number of retries for failed requests (default: 3)
            backoff_factor: Exponential backoff factor (default: 0.5)
        """
        import os

        self.registry_url = registry_url.rstrip("/")
        # Use provided API key or fall back to environment variable
        self.api_key = api_key or os.getenv("AIP_API_KEY")
        self.timeout = timeout
        self.session = requests.Session()

        # Configure retry strategy
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=backoff_factor,
            status_forcelist=[429, 500, 502, 503, 504],  # Retry on these status codes
            allowed_methods=["HEAD", "GET", "OPTIONS", "POST", "PUT", "DELETE"],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # Set default headers
        self.session.headers.update({"Content-Type": "application/json"})
        if self.api_key:
            self.session.headers.update({"Authorization": f"Bearer {self.api_key}"})

    def _handle_response(self, response: requests.Response) -> dict:
        """Handle API response and raise errors if needed"""
        try:
            data = response.json()
        except ValueError:
            raise AIPClientError(f"Invalid JSON response: {response.text}")

        if not response.ok:
            error = APIError(**data) if isinstance(data, dict) else APIError(error=str(data))
            raise AIPClientError(error.error, error.code, error.details)

        return data

    def register(self, profile: AgentProfile) -> RegistrationResponse:
        """
        Register a new agent in the registry

        Args:
            profile: Complete agent profile

        Returns:
            Registration response with ID and timestamp

        Raises:
            AIPClientError: If registration fails
        """
        response = self.session.post(
            f"{self.registry_url}/agents",
            json=profile.model_dump(exclude_none=True),
            timeout=self.timeout,
        )
        data = self._handle_response(response)
        return RegistrationResponse(**data)

    def get_agent(self, agent_id: str) -> AgentProfile:
        """
        Get an agent profile by ID

        Args:
            agent_id: Unique agent identifier

        Returns:
            Full agent profile

        Raises:
            AIPClientError: If agent not found or request fails
        """
        response = self.session.get(
            f"{self.registry_url}/agents/{agent_id}",
            timeout=self.timeout,
        )
        data = self._handle_response(response)
        return AgentProfile(**data)

    def search(
        self,
        skill: Optional[str] = None,
        min_confidence: float = 0.7,
        limit: int = 20,
        offset: int = 0,
    ) -> List[AgentProfile]:
        """
        Search for agents by skill

        Args:
            skill: Skill identifier (e.g., "text-generation")
            min_confidence: Minimum confidence level (0.0 - 1.0)
            limit: Maximum number of results
            offset: Pagination offset

        Returns:
            List of matching agent profiles

        Raises:
            AIPClientError: If search fails
        """
        params = {
            "min_confidence": min_confidence,
            "limit": limit,
            "offset": offset,
        }
        if skill:
            params["skill"] = skill

        response = self.session.get(
            f"{self.registry_url}/agents",
            params=params,
            timeout=self.timeout,
        )
        data = self._handle_response(response)
        search_response = SearchResponse(**data)
        return search_response.results

    def search_all(
        self,
        skill: Optional[str] = None,
        min_confidence: float = 0.7,
        batch_size: int = 20,
    ) -> List[AgentProfile]:
        """
        Search and fetch ALL matching agents (handles pagination automatically)

        Args:
            skill: Skill identifier (e.g., "text-generation")
            min_confidence: Minimum confidence level (0.0 - 1.0)
            batch_size: Number of results per batch (default: 20)

        Returns:
            Complete list of all matching agent profiles

        Raises:
            AIPClientError: If search fails
        """
        all_agents = []
        offset = 0

        while True:
            batch = self.search(
                skill=skill,
                min_confidence=min_confidence,
                limit=batch_size,
                offset=offset,
            )

            if not batch:
                break

            all_agents.extend(batch)
            offset += batch_size

            # Safety check to prevent infinite loops
            if len(all_agents) > 10000:
                raise AIPClientError("Too many results (>10,000), please refine your search")

        return all_agents

    def update(self, agent_id: str, profile: AgentProfile) -> UpdateResponse:
        """
        Update an existing agent profile

        Args:
            agent_id: Unique agent identifier
            profile: Updated profile data

        Returns:
            Update response with timestamp

        Raises:
            AIPClientError: If update fails
        """
        response = self.session.put(
            f"{self.registry_url}/agents/{agent_id}",
            json=profile.model_dump(exclude_none=True),
            timeout=self.timeout,
        )
        data = self._handle_response(response)
        return UpdateResponse(**data)

    def delete(self, agent_id: str) -> None:
        """
        Delete an agent from the registry

        Args:
            agent_id: Unique agent identifier

        Raises:
            AIPClientError: If deletion fails
        """
        response = self.session.delete(
            f"{self.registry_url}/agents/{agent_id}",
            timeout=self.timeout,
        )
        if response.status_code != 204:
            self._handle_response(response)

    def report_metrics(self, agent_id: str, metrics: Metrics) -> MetricsReportResponse:
        """
        Report performance metrics for an agent

        Args:
            agent_id: Unique agent identifier
            metrics: Performance metrics to report

        Returns:
            Metrics report response with timestamp

        Raises:
            AIPClientError: If reporting fails
        """
        response = self.session.post(
            f"{self.registry_url}/agents/{agent_id}/metrics",
            json=metrics.model_dump(exclude_none=True),
            timeout=self.timeout,
        )
        data = self._handle_response(response)
        return MetricsReportResponse(**data)

    def health_check(self) -> dict:
        """
        Check registry health status

        Returns:
            Health check response with status and database connectivity

        Raises:
            AIPClientError: If health check fails
        """
        response = self.session.get(
            f"{self.registry_url}/health",
            timeout=self.timeout,
        )
        return self._handle_response(response)

    def close(self):
        """Close the HTTP session"""
        self.session.close()

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()
