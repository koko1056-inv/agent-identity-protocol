import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import agentsRouter from './routes/agents';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './db/client';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(compression()); // Gzip compression
app.use(express.json()); // JSON body parser

// Request logging (simple)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// API info
app.get('/', (req, res) => {
  res.json({
    name: 'AIP Registry Server',
    version: '0.1.0',
    description: 'Reference implementation of Agent Identity Protocol Registry',
    endpoints: {
      health: '/health',
      agents: '/agents',
      register: 'POST /agents',
      search: 'GET /agents?skill={skill}',
      get_agent: 'GET /agents/{id}',
      update_agent: 'PUT /agents/{id}',
      delete_agent: 'DELETE /agents/{id}',
      report_metrics: 'POST /agents/{id}/metrics',
    },
    documentation: 'https://github.com/koko1056-inv/agent-identity-protocol',
  });
});

// Routes
app.use('/agents', agentsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 AIP Registry Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation: https://github.com/koko1056-inv/agent-identity-protocol`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
