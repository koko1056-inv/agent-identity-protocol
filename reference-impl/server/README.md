# AIP Registry Server

Reference implementation of the Agent Identity Protocol (AIP) Registry.

## Quick Start

### Using Docker (Recommended)

```bash
# Start the server and database
docker-compose up

# The server will be available at http://localhost:3000
```

That's it! The registry is now running.

### Manual Setup

#### Prerequisites
- Node.js 20+
- PostgreSQL 16+

#### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Register Agent
```bash
POST /agents
Content-Type: application/json

{
  "id": "did:aip:my-agent",
  "name": "MyAgent",
  "version": "1.0.0",
  "capabilities": [
    {
      "skill": "text-generation",
      "confidence": 0.9
    }
  ]
}
```

### Search Agents
```bash
GET /agents?skill=text-generation&min_confidence=0.8&limit=20
```

### Get Agent Profile
```bash
GET /agents/:id
```

### Update Agent
```bash
PUT /agents/:id
Content-Type: application/json

{
  "id": "did:aip:my-agent",
  "name": "MyAgent",
  "version": "1.1.0",
  "capabilities": [...]
}
```

### Delete Agent
```bash
DELETE /agents/:id
```

### Report Metrics
```bash
POST /agents/:id/metrics
Content-Type: application/json

{
  "tasks_completed": 100,
  "avg_response_time_ms": 1200,
  "success_rate": 0.98,
  "uptime_30d": 0.995
}
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Database Management

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Create a new migration
npm run db:migrate

# Push schema changes without migration
npm run db:push
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | - | PostgreSQL connection string |
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |

## Development

```bash
# Start development server with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code
npm run format
```

## Production Deployment

### Docker

```bash
# Build image
docker build -t aip-registry .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  aip-registry
```

### Systemd (Linux)

Create `/etc/systemd/system/aip-registry.service`:

```ini
[Unit]
Description=AIP Registry Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/aip-registry
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable aip-registry
sudo systemctl start aip-registry
```

## Architecture

```
┌─────────────────────────────────────┐
│         Express Server               │
│  ┌────────────────────────────────┐ │
│  │   Routes (/agents)             │ │
│  └────────────┬───────────────────┘ │
│               │                      │
│  ┌────────────▼───────────────────┐ │
│  │   Validation (Zod)             │ │
│  └────────────┬───────────────────┘ │
│               │                      │
│  ┌────────────▼───────────────────┐ │
│  │   Prisma ORM                   │ │
│  └────────────┬───────────────────┘ │
└───────────────┼─────────────────────┘
                │
         ┌──────▼──────┐
         │  PostgreSQL │
         └─────────────┘
```

## License

MIT
