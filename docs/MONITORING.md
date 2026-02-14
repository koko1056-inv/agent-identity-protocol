# Monitoring & Metrics Guide

Complete guide to monitoring AIP Registry with Grafana, Prometheus, and other tools.

## 📊 Available Metrics Endpoints

### 1. Registry Statistics (`/metrics/stats`)

Returns aggregate statistics about the registry:

```bash
curl http://localhost:3000/metrics/stats
```

**Response**:
```json
{
  "agents": {
    "total": 42,
    "bySkill": {
      "text-generation": 15,
      "translation": 8,
      "summarization": 12
    }
  },
  "apiKeys": {
    "total": 10,
    "active": 8
  },
  "webhooks": {
    "total": 5,
    "active": 4
  },
  "timestamp": "2026-02-15T02:30:00.000Z"
}
```

### 2. Top Performing Agents (`/metrics/top-agents`)

Returns agents with best performance metrics:

```bash
curl http://localhost:3000/metrics/top-agents?limit=10
```

### 3. Prometheus Metrics (`/metrics/prometheus`)

Prometheus-compatible metrics endpoint:

```bash
curl http://localhost:3000/metrics/prometheus
```

**Output** (Prometheus text format):
```
# HELP aip_agents_total Total number of registered agents
# TYPE aip_agents_total gauge
aip_agents_total 42

# HELP aip_tasks_completed_total Total tasks completed by all agents
# TYPE aip_tasks_completed_total counter
aip_tasks_completed_total 15420
```

---

## 🔥 Grafana + Prometheus Setup

### Option 1: Docker Compose (Quick Start)

Add to your `docker-compose.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: aip-prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - aip-network

  grafana:
    image: grafana/grafana:latest
    container_name: aip-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    networks:
      - aip-network

volumes:
  prometheus_data:
  grafana_data:
```

### Prometheus Configuration

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'aip-registry'
    static_configs:
      - targets: ['server:3000']
    metrics_path: '/metrics/prometheus'
```

### Grafana Data Source

Create `monitoring/grafana/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

### Grafana Dashboard

Create `monitoring/grafana/dashboards/dashboard.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'AIP Registry'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

Create `monitoring/grafana/dashboards/aip-registry.json`:

```json
{
  "dashboard": {
    "title": "AIP Registry Overview",
    "panels": [
      {
        "title": "Total Agents",
        "targets": [
          {
            "expr": "aip_agents_total",
            "legendFormat": "Agents"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Tasks Completed",
        "targets": [
          {
            "expr": "rate(aip_tasks_completed_total[5m])",
            "legendFormat": "Tasks/sec"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Average Success Rate",
        "targets": [
          {
            "expr": "aip_avg_success_rate",
            "legendFormat": "Success Rate"
          }
        ],
        "type": "gauge"
      },
      {
        "title": "Average Response Time",
        "targets": [
          {
            "expr": "aip_avg_response_time_ms",
            "legendFormat": "Response Time (ms)"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

### Start Monitoring Stack

```bash
docker-compose up -d prometheus grafana

# Access Grafana
open http://localhost:3001
# Login: admin/admin
```

---

## 📈 Option 2: Cloud Monitoring

### AWS CloudWatch

```typescript
// Install AWS SDK
npm install @aws-sdk/client-cloudwatch

// Custom metrics publisher
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: 'us-east-1' });

async function publishMetrics(stats: any) {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'AIP/Registry',
    MetricData: [
      {
        MetricName: 'TotalAgents',
        Value: stats.agents.total,
        Unit: 'Count',
      },
      {
        MetricName: 'ActiveAPIKeys',
        Value: stats.apiKeys.active,
        Unit: 'Count',
      },
    ],
  }));
}
```

### Google Cloud Monitoring

```typescript
// Install Google Cloud Monitoring
npm install @google-cloud/monitoring

import { MetricServiceClient } from '@google-cloud/monitoring';

const client = new MetricServiceClient();

async function writeMetrics(stats: any) {
  const projectId = await client.getProjectId();
  const projectName = client.projectPath(projectId);

  const timeSeriesData = {
    metric: {
      type: 'custom.googleapis.com/aip/agents_total',
    },
    points: [
      {
        interval: {
          endTime: {
            seconds: Date.now() / 1000,
          },
        },
        value: {
          int64Value: stats.agents.total,
        },
      },
    ],
  };

  await client.createTimeSeries({
    name: projectName,
    timeSeries: [timeSeriesData],
  });
}
```

### Datadog

```typescript
// Install Datadog client
npm install dd-trace

import tracer from 'dd-trace';
tracer.init();

// Send custom metrics
const { dogstatsd } = tracer;

async function sendMetrics(stats: any) {
  dogstatsd.gauge('aip.agents.total', stats.agents.total);
  dogstatsd.gauge('aip.apikeys.active', stats.apiKeys.active);
  dogstatsd.gauge('aip.webhooks.active', stats.webhooks.active);
}
```

---

## 🔔 Alerting

### Prometheus Alerting Rules

Create `monitoring/alerts.yml`:

```yaml
groups:
  - name: aip_registry
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: aip_avg_success_rate < 0.95
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Success rate below 95%"
          description: "Average success rate is {{ $value }}"

      - alert: SlowResponseTime
        expr: aip_avg_response_time_ms > 2000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "Average response time is {{ $value }}ms"

      - alert: RegistryDown
        expr: up{job="aip-registry"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "AIP Registry is down"
```

### Email Alerts (via Alertmanager)

Create `monitoring/alertmanager.yml`:

```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@your-domain.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email'

receivers:
  - name: 'email'
    email_configs:
      - to: 'admin@your-domain.com'
```

---

## 📊 Custom Metrics Dashboard

Build a simple HTML dashboard:

```html
<!DOCTYPE html>
<html>
<head>
  <title>AIP Registry Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .metric { display: inline-block; margin: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    .metric h3 { margin: 0 0 10px 0; }
    .metric .value { font-size: 2em; font-weight: bold; color: #2196F3; }
  </style>
</head>
<body>
  <h1>🤖 AIP Registry Dashboard</h1>

  <div id="stats"></div>

  <canvas id="skillsChart" width="400" height="200"></canvas>

  <script>
    async function loadStats() {
      const response = await fetch('http://localhost:3000/metrics/stats');
      const data = await response.json();

      // Display metrics
      document.getElementById('stats').innerHTML = `
        <div class="metric">
          <h3>Total Agents</h3>
          <div class="value">${data.agents.total}</div>
        </div>
        <div class="metric">
          <h3>Active API Keys</h3>
          <div class="value">${data.apiKeys.active}</div>
        </div>
        <div class="metric">
          <h3>Active Webhooks</h3>
          <div class="value">${data.webhooks.active}</div>
        </div>
      `;

      // Chart
      const ctx = document.getElementById('skillsChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(data.agents.bySkill),
          datasets: [{
            label: 'Agents by Skill',
            data: Object.values(data.agents.bySkill),
            backgroundColor: '#2196F3'
          }]
        }
      });
    }

    loadStats();
    setInterval(loadStats, 60000); // Refresh every minute
  </script>
</body>
</html>
```

---

## 🧪 Health Checks

### Uptime Monitoring

**UptimeRobot** (free):
```
Monitor URL: https://registry.your-domain.com/health
Interval: 5 minutes
Alert: Email when down
```

**Healthchecks.io**:
```bash
# Cron job to ping healthchecks.io
*/5 * * * * curl -fsS --retry 3 https://hc-ping.com/YOUR-UUID && curl -fsS http://localhost:3000/health > /dev/null
```

### Kubernetes Liveness/Readiness Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 📱 Mobile Alerts

### Slack Webhook

```bash
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🚨 AIP Registry Alert",
    "attachments": [{
      "color": "danger",
      "text": "Success rate dropped below 95%"
    }]
  }'
```

### Discord Webhook

```bash
curl -X POST https://discord.com/api/webhooks/YOUR/WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "🚨 **AIP Registry Alert**\nSuccess rate: 94%"
  }'
```

---

## 🎯 Recommended Metrics to Track

### Core Metrics
- ✅ Total agents registered
- ✅ Agents by skill distribution
- ✅ Active API keys
- ✅ Active webhooks

### Performance Metrics
- ✅ Average success rate
- ✅ Average response time
- ✅ Tasks completed (rate)
- ✅ Uptime (30-day rolling)

### Operational Metrics
- ✅ API request rate
- ✅ Error rate
- ✅ Database query time
- ✅ Cache hit rate

---

**Monitor your registry with confidence!** 📊
