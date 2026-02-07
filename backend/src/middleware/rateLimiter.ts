import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitStore>;
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 5) {
    this.store = new Map();
    this.windowMs = windowMs; // Time window in milliseconds
    this.maxRequests = maxRequests; // Max requests per window
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private getClientKey(req: Request): string {
    // Use IP address as the key
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.getClientKey(req);
      const now = Date.now();
      const record = this.store.get(key);

      if (!record || now > record.resetTime) {
        // No record or window expired, create new record
        this.store.set(key, {
          count: 1,
          resetTime: now + this.windowMs,
        });
        
        this.setRateLimitHeaders(res, 1, now + this.windowMs);
        next();
        return;
      }

      if (record.count >= this.maxRequests) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        
        res.set('Retry-After', String(retryAfter));
        this.setRateLimitHeaders(res, record.count, record.resetTime);
        
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        });
        return;
      }

      // Increment count
      record.count++;
      this.store.set(key, record);
      
      this.setRateLimitHeaders(res, record.count, record.resetTime);
      next();
    };
  }

  private setRateLimitHeaders(res: Response, current: number, resetTime: number): void {
    res.set({
      'X-RateLimit-Limit': String(this.maxRequests),
      'X-RateLimit-Remaining': String(Math.max(0, this.maxRequests - current)),
      'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
    });
  }

  // Get current stats for a client
  getStats(req: Request): RateLimitStore | null {
    const key = this.getClientKey(req);
    return this.store.get(key) || null;
  }

  // Reset rate limit for a client
  reset(req: Request): void {
    const key = this.getClientKey(req);
    this.store.delete(key);
  }

  // Clear all rate limit records
  clear(): void {
    this.store.clear();
  }
}

// Create rate limiter instances for different routes
// API endpoints: 5 requests per minute
export const apiLimiter = new RateLimiter(60000, 5);

// Stock data endpoints: More restrictive to protect Alpha Vantage API quota
// Alpha Vantage free tier: 25 requests per day, 5 per minute
export const stockDataLimiter = new RateLimiter(60000, 5);
