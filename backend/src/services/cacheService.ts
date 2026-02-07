import Redis from 'ioredis';

/**
 * Cache Service using Redis
 * Implements graceful degradation - if Redis is unavailable, app continues without caching
 */
class CacheService {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private enableLogging: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis client with error handling
   */
  private initializeRedis(): void {
    try {
      const redisUrl = process.env.REDIS_URL;
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
      
      // Enable cache logging if environment variable is set
      this.enableLogging = process.env.CACHE_LOGGING === 'true';

      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) {
              console.warn('Redis: Max retries reached, operating without cache');
              return null;
            }
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
        });
      } else {
        this.client = new Redis({
          host: redisHost,
          port: redisPort,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) {
              console.warn('Redis: Max retries reached, operating without cache');
              return null;
            }
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
        });
      }

      // Connection event handlers
      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('Redis: Connected successfully');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        console.log('Redis: Ready to accept commands');
      });

      this.client.on('error', (error: Error) => {
        this.isConnected = false;
        console.warn('Redis: Connection error (app will continue without cache):', error.message);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        console.warn('Redis: Connection closed');
      });

      this.client.on('reconnecting', () => {
        console.log('Redis: Attempting to reconnect...');
      });

      // Attempt initial connection
      this.client.connect().catch((error: Error) => {
        console.warn('Redis: Initial connection failed (app will continue without cache):', error.message);
        this.isConnected = false;
      });
    } catch (error) {
      console.warn('Redis: Failed to initialize (app will continue without cache):', error);
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or null if not found/error
   */
  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      if (this.enableLogging) {
        console.log(`Cache MISS (disconnected): ${key}`);
      }
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (this.enableLogging) {
        console.log(`Cache ${value ? 'HIT' : 'MISS'}: ${key}`);
      }
      return value;
    } catch (error) {
      console.warn(`Redis: Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get parsed JSON value from cache
   * @param key Cache key
   * @returns Parsed object or null if not found/error
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn(`Redis: Error parsing JSON for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds (optional)
   * @returns true if successful, false otherwise
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      if (this.enableLogging) {
        console.log(`Cache SET skipped (disconnected): ${key}`);
      }
      return false;
    }

    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      if (this.enableLogging) {
        console.log(`Cache SET: ${key} (TTL: ${ttlSeconds || 'none'}s)`);
      }
      return true;
    } catch (error) {
      console.warn(`Redis: Error setting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set JSON value in cache
   * @param key Cache key
   * @param value Object to cache
   * @param ttlSeconds Time to live in seconds (optional)
   * @returns true if successful, false otherwise
   */
  async setJSON(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString, ttlSeconds);
    } catch (error) {
      console.warn(`Redis: Error stringifying JSON for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param key Cache key
   * @returns true if successful, false otherwise
   */
  async delete(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      if (this.enableLogging) {
        console.log(`Cache DELETE: ${key}`);
      }
      return true;
    } catch (error) {
      console.warn(`Redis: Error deleting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param pattern Pattern to match (e.g., "stock:daily:*")
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      const deleted = await this.client.del(...keys);
      if (this.enableLogging) {
        console.log(`Cache DELETE pattern: ${pattern} (${deleted} keys)`);
      }
      return deleted;
    } catch (error) {
      console.warn(`Redis: Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Clear all cache
   * @returns true if successful, false otherwise
   */
  async clear(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.flushdb();
      if (this.enableLogging) {
        console.log('Cache CLEAR: All keys deleted');
      }
      return true;
    } catch (error) {
      console.warn('Redis: Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Check if cache is available
   * @returns true if connected, false otherwise
   */
  isAvailable(): boolean {
    return this.isConnected;
  }

  /**
   * Get cache statistics
   * @returns Object with cache stats
   */
  async getStats(): Promise<{ connected: boolean; keys?: number; memory?: string }> {
    const stats: { connected: boolean; keys?: number; memory?: string } = {
      connected: this.isConnected,
    };

    if (!this.client || !this.isConnected) {
      return stats;
    }

    try {
      const dbSize = await this.client.dbsize();
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      
      stats.keys = dbSize;
      stats.memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';
    } catch (error) {
      console.warn('Redis: Error getting stats:', error);
    }

    return stats;
  }

  /**
   * Close Redis connection (for graceful shutdown)
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('Redis: Disconnected successfully');
      } catch (error) {
        console.warn('Redis: Error disconnecting:', error);
      }
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export TTL constants for consistency
export const CacheTTL = {
  DAILY_DATA: 24 * 60 * 60,      // 24 hours
  INTRADAY_DATA: 5 * 60,          // 5 minutes
  METRICS: 24 * 60 * 60,          // 24 hours
  SCREENER: 60 * 60,              // 1 hour
} as const;

// Export cache key helpers
export const CacheKeys = {
  dailyData: (symbol: string) => `stock:daily:${symbol}`,
  intradayData: (symbol: string, interval: string) => `stock:intraday:${symbol}:${interval}`,
  metrics: (symbol: string) => `metrics:${symbol}`,
  screener: (filterHash: string) => `screener:${filterHash}`,
} as const;
