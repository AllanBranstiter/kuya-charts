import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import stockRoutes from './routes/stockRoutes.js';
import stockListRoutes from './routes/stockListRoutes.js';
import authRoutes from './routes/authRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import chartConfigRoutes from './routes/chartConfigRoutes.js';
import { initializeDatabase, checkDatabaseConnection } from './services/databaseService.js';
import { websocketService } from './services/websocketService.js';
import { realtimePriceService } from './services/realtimePriceService.js';

// Debug: Log environment variables to verify they're loaded
console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT);
console.log('ALPHA_VANTAGE_API_KEY:', process.env.ALPHA_VANTAGE_API_KEY ? '***SET***' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Basic health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Kuya Charts API is running',
    timestamp: new Date().toISOString(),
  });
});

// Stock API routes
app.use('/api/stock', stockRoutes);
app.use('/api/stocks', stockListRoutes);

// Authentication routes
app.use('/api/auth', authRoutes);

// Watchlist routes
app.use('/api/watchlist', watchlistRoutes);

// Chart config routes
app.use('/api/chart-configs', chartConfigRoutes);

// 404 handler - must be after all other routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/stock/:symbol/daily',
      'GET /api/stock/:symbol/intraday?interval=<interval>',
      'GET /api/stocks/list?sector=&minMarketCap=&maxMarketCap=&limit=&offset=',
      'GET /api/stocks/sectors',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'GET /api/watchlist',
      'POST /api/watchlist',
      'DELETE /api/watchlist/:symbol',
      'GET /api/watchlist/check/:symbol',
      'GET /api/chart-configs',
      'GET /api/chart-configs/:id',
      'POST /api/chart-configs',
      'PUT /api/chart-configs/:id',
      'DELETE /api/chart-configs/:id',
    ],
  });
});

// Global error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    const dbConnected = await checkDatabaseConnection();
    
    if (dbConnected) {
      console.log('✅ Database connection successful');
      
      // Initialize database schema
      console.log('Initializing database schema...');
      await initializeDatabase();
      console.log('✅ Database schema initialized');
    } else {
      console.warn('⚠️  Database connection failed - stock list features will not be available');
      console.warn('Please ensure PostgreSQL is running and DATABASE_URL is configured in .env');
    }
  } catch (error) {
    console.error('⚠️  Database initialization error:', error);
    console.warn('Continuing without database - stock list features will not be available');
  }

  // Create HTTP server from Express app
  const server = http.createServer(app);

  // Initialize WebSocket server
  console.log('Initializing WebSocket server...');
  websocketService.initialize(server);

  // Start real-time price service
  console.log('Starting real-time price service...');
  await realtimePriceService.start();

  // Start the HTTP server with WebSocket support
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API Health Check: http://localhost:${PORT}/api/health`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
  });

  // Graceful shutdown handler
  const shutdown = async () => {
    console.log('\nReceived shutdown signal, closing gracefully...');
    
    // Stop real-time price service
    realtimePriceService.stop();
    
    // Close WebSocket connections
    websocketService.shutdown();
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Start the server
startServer();
