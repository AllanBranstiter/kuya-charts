// Authentication middleware for JWT verification

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { verifyToken } from '../utils/auth';

/**
 * Middleware to authenticate requests using JWT tokens
 * Expects token in Authorization header as "Bearer <token>"
 * Attaches decoded user information to request.user
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization header provided',
      });
      return;
    }

    // Check if header follows "Bearer <token>" format
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization header format. Expected: Bearer <token>',
      });
      return;
    }

    const token = parts[1];

    // Verify and decode the token
    const decoded = verifyToken(token);
    
    // Attach user info to request object
    req.user = decoded;
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    // Handle token verification errors
    const message = error instanceof Error ? error.message : 'Invalid token';
    
    res.status(401).json({
      error: 'Unauthorized',
      message,
    });
  }
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if token is missing
 * Useful for routes that work with or without authentication
 */
export function optionalAuthentication(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    // If no auth header, just continue without setting user
    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    
    // If invalid format, just continue without setting user
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      next();
      return;
    }

    const token = parts[1];

    try {
      // Try to verify token
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // Token verification failed, continue without user
      console.log('Optional auth: Invalid token provided');
    }
    
    next();
  } catch (error) {
    // Any unexpected error, just continue
    console.error('Optional auth error:', error);
    next();
  }
}
