import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import stockRoutes from './routes/stockRoutes.js';

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
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Basic health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Kuya Charts API is running',
    timestamp: new Date().toISOString(),
  });
});

// Stock API routes
app.use('/api/stock', stockRoutes);

// 404 handler - must be after all other routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/stock/:symbol/daily',
      'GET /api/stock/:symbol/intraday?interval=<interval>',
    ],
  });
});

// Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Health Check: http://localhost:${PORT}/api/health`);
});
