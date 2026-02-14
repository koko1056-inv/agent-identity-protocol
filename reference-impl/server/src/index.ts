import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import agentsRouter from './routes/agents';
import adminRouter from './routes/admin';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
import { authenticateApiKey, requirePermission } from './middleware/auth';
import { prisma } from './db/client';
import { validateConfig } from './utils/config';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate configuration
const config = validateConfig();

const app = express();
const PORT = config.PORT;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: config.CORS_ORIGIN || '*',
  credentials: true,
})); // CORS
app.use(compression()); // Gzip compression
app.use(express.json({ limit: '1mb' })); // JSON body parser with size limit
app.use(requestIdMiddleware); // Request ID

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      requestId: req.headers['x-request-id'],
    });
  });
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

// Admin routes (protected - requires admin setup)
// For now, these are unprotected. In production, add proper admin authentication
app.use('/admin', adminRouter);

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
