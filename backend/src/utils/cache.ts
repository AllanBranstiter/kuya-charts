import { CacheEntry } from '../types/stock.js';

// Simple in-memory cache with 5-minute expiration
class Cache {
  private cache: Map<string, CacheEntry<any>>;
  private readonly TTL: number = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor() {
    this.cache = new Map();
    // Clean up expired entries every minute
    setInterval(() => this.cleanExpired(), 60 * 1000);
  }

  // Generate cache key from symbol and optional interval
  private generateKey(symbol: string, interval?: string): string {
    return interval ? `${symbol}:${interval}` : symbol;
  }

  // Set cache entry
  set<T>(symbol: string, data: T, interval?: string): void {
    const key = this.generateKey(symbol, interval);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    this.cache.set(key, entry);
  }

  // Get cache entry if not expired
  get<T>(symbol: string, interval?: string): T | null {
    const key = this.generateKey(symbol, interval);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const age = Date.now() - entry.timestamp;
    if (age > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // Check if cache has valid entry
  has(symbol: string, interval?: string): boolean {
    return this.get(symbol, interval) !== null;
  }

  // Clear specific cache entry
  delete(symbol: string, interval?: string): boolean {
    const key = this.generateKey(symbol, interval);
    return this.cache.delete(key);
  }

  // Clear all cache entries
  clear(): void {
    this.cache.clear();
  }

  // Remove expired entries
  private cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.TTL) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cleaned ${keysToDelete.length} expired cache entries`);
    }
  }

  // Get cache statistics
  getStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.TTL,
    };
  }
}

// Export singleton instance
export const cache = new Cache();
