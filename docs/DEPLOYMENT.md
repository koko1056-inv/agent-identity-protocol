# Deployment Guide

Complete guide to deploying AIP Registry to production.

## 🎯 Deployment Options

- [Docker Compose](#docker-compose-deployment) - Simple single-server deployment
- [AWS](#aws-deployment) - Elastic Beanstalk, ECS, or EC2
- [Google Cloud Platform](#gcp-deployment) - Cloud Run or GKE
- [Azure](#azure-deployment) - App Service or AKS
- [DigitalOcean](#digitalocean-deployment) - App Platform
- [Fly.io](#flyio-deployment) - Global edge deployment

---

## 🐳 Docker Compose Deployment

### Prerequisites
- Linux server with Docker + Docker Compose
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

### Setup

```bash
# 1. Clone repository
git clone https://github.com/koko1056-inv/agent-identity-protocol.git
cd agent-identity-protocol/reference-impl/server

# 2. Create production .env
cat > .env <<EOF
DATABASE_URL=postgresql://aip:$(openssl rand -base64 32)@postgres:5432/aip_registry?schema=public
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=info
REQUIRE_API_KEY=true
ADMIN_KEY=$(openssl rand -base64 32)
EOF

# 3. Save admin key securely
grep ADMIN_KEY .env > ~/.aip-admin-key
chmod 600 ~/.aip-admin-key

# 4. Start services
docker-compose up -d

# 5. Run migrations
docker-compose exec server npx prisma migrate deploy

# 6. Verify
curl http://localhost:3000/health
```

### SSL/HTTPS with Nginx

```nginx
# /etc/nginx/sites-available/aip-registry
server {
    listen 80;
    server_name registry.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name registry.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/registry.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/registry.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ☁️ AWS Deployment

### Option 1: AWS Elastic Beanstalk

```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize EB application
cd reference-impl/server
eb init -p docker aip-registry --region us-east-1

# 3. Set environment variables
eb setenv \
  DATABASE_URL="postgresql://..." \
  NODE_ENV=production \
  REQUIRE_API_KEY=true \
  ADMIN_KEY="$(openssl rand -base64 32)"

# 4. Create and deploy
eb create aip-registry-prod
eb deploy
```

### Option 2: AWS ECS + RDS

**Infrastructure as Code (Terraform)**:

```hcl
# main.tf
resource "aws_ecs_cluster" "aip_registry" {
  name = "aip-registry-cluster"
}

resource "aws_db_instance" "postgres" {
  identifier           = "aip-registry-db"
  engine              = "postgres"
  engine_version      = "16"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  db_name             = "aip_registry"
  username            = "aip"
  password            = var.db_password
  publicly_accessible = false
  
  vpc_security_group_ids = [aws_security_group.db.id]
}

resource "aws_ecs_task_definition" "app" {
  family                   = "aip-registry"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = 256
  memory                  = 512

  container_definitions = jsonencode([{
    name  = "aip-registry"
    image = "your-registry/aip-registry:latest"
    environment = [
      { name = "DATABASE_URL", value = "postgresql://..." },
      { name = "NODE_ENV", value = "production" }
    ]
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
  }])
}
```

### Database Migration on AWS

```bash
# Run migrations via ECS task
aws ecs run-task \
  --cluster aip-registry-cluster \
  --task-definition aip-registry \
  --overrides '{
    "containerOverrides": [{
      "name": "aip-registry",
      "command": ["npx", "prisma", "migrate", "deploy"]
    }]
  }'
```

---

## 🌐 Google Cloud Platform Deployment

### Option 1: Cloud Run (Serverless)

```bash
# 1. Build and push Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT/aip-registry

# 2. Deploy to Cloud Run
gcloud run deploy aip-registry \
  --image gcr.io/YOUR_PROJECT/aip-registry \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,REQUIRE_API_KEY=true" \
  --set-secrets "DATABASE_URL=aip-db-url:latest,ADMIN_KEY=aip-admin-key:latest"

# 3. Setup Cloud SQL (PostgreSQL)
gcloud sql instances create aip-registry-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1

# 4. Create database
gcloud sql databases create aip_registry --instance=aip-registry-db
```

### Option 2: GKE (Kubernetes)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aip-registry
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aip-registry
  template:
    metadata:
      labels:
        app: aip-registry
    spec:
      containers:
      - name: aip-registry
        image: gcr.io/YOUR_PROJECT/aip-registry:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aip-secrets
              key: database-url
        - name: NODE_ENV
          value: production
---
apiVersion: v1
kind: Service
metadata:
  name: aip-registry-service
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: aip-registry
```

---

## 🔷 Azure Deployment

### Option 1: Azure App Service

```bash
# 1. Create resource group
az group create --name aip-registry-rg --location eastus

# 2. Create PostgreSQL server
az postgres flexible-server create \
  --resource-group aip-registry-rg \
  --name aip-registry-db \
  --location eastus \
  --admin-user aip \
  --admin-password 'YOUR_SECURE_PASSWORD' \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16

# 3. Create database
az postgres flexible-server db create \
  --resource-group aip-registry-rg \
  --server-name aip-registry-db \
  --database-name aip_registry

# 4. Create App Service plan
az appservice plan create \
  --name aip-registry-plan \
  --resource-group aip-registry-rg \
  --sku B1 \
  --is-linux

# 5. Create web app
az webapp create \
  --resource-group aip-registry-rg \
  --plan aip-registry-plan \
  --name aip-registry \
  --deployment-container-image-name your-dockerhub/aip-registry:latest

# 6. Configure environment variables
az webapp config appsettings set \
  --resource-group aip-registry-rg \
  --name aip-registry \
  --settings \
    DATABASE_URL="postgresql://..." \
    NODE_ENV=production \
    REQUIRE_API_KEY=true
```

---

## 🌊 DigitalOcean Deployment

### App Platform (PaaS)

```yaml
# .do/app.yaml
name: aip-registry
services:
- name: web
  github:
    repo: your-username/agent-identity-protocol
    branch: main
    deploy_on_push: true
  source_dir: /reference-impl/server
  dockerfile_path: /reference-impl/server/Dockerfile
  health_check:
    http_path: /health
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
  - key: REQUIRE_API_KEY
    value: "true"
  - key: ADMIN_KEY
    type: SECRET
    value: YOUR_ADMIN_KEY

databases:
- name: db
  engine: PG
  production: true
  version: "16"
```

Deploy via CLI:
```bash
doctl apps create --spec .do/app.yaml
```

---

## 🚀 Fly.io Deployment

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
flyctl auth login

# 3. Initialize app
cd reference-impl/server
flyctl launch --name aip-registry --region sjc

# 4. Create PostgreSQL
flyctl postgres create --name aip-registry-db

# 5. Attach database
flyctl postgres attach --app aip-registry aip-registry-db

# 6. Set secrets
flyctl secrets set \
  ADMIN_KEY=$(openssl rand -base64 32) \
  REQUIRE_API_KEY=true

# 7. Deploy
flyctl deploy

# 8. Run migrations
flyctl ssh console -C "npx prisma migrate deploy"
```

---

## 🔒 Security Checklist

### Before Production

- [ ] **SSL/TLS enabled** - Use Let's Encrypt or cloud provider SSL
- [ ] **ADMIN_KEY set** - Strong random key (32+ characters)
- [ ] **REQUIRE_API_KEY=true** - Enable API key authentication
- [ ] **Database password** - Strong, randomly generated
- [ ] **CORS_ORIGIN** - Restrict to your domain
- [ ] **LOG_LEVEL=info** - Don't expose debug logs
- [ ] **Firewall rules** - Only allow necessary ports (80, 443)
- [ ] **Database backups** - Enable automatic backups
- [ ] **Rate limiting** - Configure appropriate limits
- [ ] **Monitoring** - Setup health checks and alerts

---

## 📊 Monitoring & Logging

### Health Checks

```bash
# Simple uptime monitoring
*/5 * * * * curl -f https://registry.your-domain.com/health || echo "Registry down!" | mail -s "AIP Registry Alert" admin@example.com
```

### Application Monitoring

**Recommended Tools**:
- **Datadog** - Full-stack monitoring
- **New Relic** - APM
- **Sentry** - Error tracking
- **Grafana + Prometheus** - Open-source metrics

### Log Aggregation

**Structured logs** are already JSON-formatted for easy parsing:

```bash
# Forward logs to CloudWatch
docker-compose logs -f server | aws logs put-log-events ...

# Or use Fluentd/Logstash
```

---

## 🔄 Continuous Deployment

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker image
        run: |
          docker build -t aip-registry:${{ github.sha }} ./reference-impl/server
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag aip-registry:${{ github.sha }} your-registry/aip-registry:latest
          docker push your-registry/aip-registry:latest
      
      - name: Deploy to production
        run: |
          # Deploy to your chosen platform
          # Examples: kubectl apply, aws ecs update-service, flyctl deploy, etc.
```

---

## 🆘 Troubleshooting

### Database Connection Issues

```bash
# Test database connectivity
docker-compose exec server npx prisma db pull

# Check database status
docker-compose logs postgres
```

### Migration Failures

```bash
# Reset database (⚠️ DESTRUCTIVE)
docker-compose exec server npx prisma migrate reset

# Force re-run migrations
docker-compose exec server npx prisma migrate deploy --force
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Increase memory limit (docker-compose.yml)
services:
  server:
    deploy:
      resources:
        limits:
          memory: 1G
```

---

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share tips
- **Documentation**: https://github.com/koko1056-inv/agent-identity-protocol

---

**Production-ready deployment in under 10 minutes!** 🚀
