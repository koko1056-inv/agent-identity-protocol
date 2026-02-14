"""
Basic example of using the AIP Python SDK
"""

from aip import AIPClient, create_agent, create_capability, Metrics

def main():
    # Create client
    client = AIPClient("http://localhost:3000")

    print("🤖 Agent Identity Protocol - Python SDK Example\n")

    # 1. Create agent profile
    my_agent = create_agent(
        id="did:aip:python-example-agent",
        name="Python Example Agent",
        capabilities=[
            create_capability("text-generation", 0.95),
            create_capability("summarization", 0.88),
        ],
        description="Example agent created with Python SDK",
    )

    # 2. Register agent
    try:
        registration = client.register(my_agent)
        print(f"✅ Agent registered!")
        print(f"   ID: {registration.id}")
        print(f"   Registered at: {registration.registered_at}\n")
    except Exception as e:
        print(f"❌ Registration failed: {e}\n")
        return

    # 3. Search for agents
    print("🔍 Searching for text generation agents...\n")
    try:
        agents = client.search(skill="text-generation", min_confidence=0.9)
        print(f"Found {len(agents)} agent(s):\n")

        for i, agent in enumerate(agents, 1):
            cap = next((c for c in agent.capabilities if c.skill == "text-generation"), None)
            print(f"{i}. {agent.name} (v{agent.version})")
            print(f"   Confidence: {cap.confidence if cap else 'N/A'}")
            if agent.metrics:
                print(f"   Tasks: {agent.metrics.tasks_completed or 0}")
            print()
    except Exception as e:
        print(f"❌ Search failed: {e}\n")

    # 4. Get specific agent
    print("📋 Fetching agent profile...\n")
    try:
        profile = client.get_agent("did:aip:python-example-agent")
        print(f"Agent: {profile.name}")
        print(f"Version: {profile.version}")
        print(f"Capabilities: {', '.join(c.skill for c in profile.capabilities)}\n")
    except Exception as e:
        print(f"❌ Failed to fetch profile: {e}\n")

    # 5. Report metrics
    print("📊 Reporting metrics...\n")
    try:
        metrics = Metrics(
            tasks_completed=75,
            avg_response_time_ms=950,
            success_rate=0.99,
            uptime_30d=0.997,
        )
        report = client.report_metrics("did:aip:python-example-agent", metrics)
        print(f"✅ Metrics reported!")
        print(f"   Recorded at: {report.recorded_at}\n")
    except Exception as e:
        print(f"❌ Failed to report metrics: {e}\n")

    print("🎉 Example completed!\n")


if __name__ == "__main__":
    main()
