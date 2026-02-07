# MILESTONE 4.1.1: Redis Caching Layer Setup

## ✅ Completed

This milestone implements a Redis caching layer for the kuya-charts backend to reduce API calls to Alpha Vantage and improve performance.

## 📋 Implementation Summary

### Files Created

1. **`/backend/src/services/cacheService.ts`** (New)
   - Comprehensive Redis cache service with graceful degradation
   - Methods: `get()`, `set()`, `getJSON()`, `setJSON()`, `delete()`, `deletePattern()`, `clear()`, `getStats()`
   - Automatic connection management with retry logic
   - Graceful fallback when Redis is unavailable

### Files Modified

1. **`/backend/.env.example`**
   - Added Redis connection configuration
   - Added cache logging configuration
   - Added Redis setup instructions

2. **`/backend/src/services/alphaVantageService.ts`**
   - Implemented cache-aside pattern for `fetchDailyData()`
   - Implemented cache-aside pattern for `fetchIntradayData()`
   - Implemented cache-aside pattern for `fetchHistoricalData()`

3. **`/backend/src/services/databaseService.ts`**
   - Implemented caching for `getStocksList()` (screener results)
   - Implemented caching for `getStockBySymbol()` (stock metadata)
   - Added filter hashing for screener cache keys

## 🔑 Cache Key Patterns

The caching layer uses the following key patterns:

| Key Pattern | Description | TTL | Example |
|-------------|-------------|-----|---------|
| `stock:daily:{symbol}` | Daily/Historical OHLCV data | 24 hours | `stock:daily:AAPL` |
| `stock:intraday:{symbol}:{interval}` | Intraday OHLCV data | 5 minutes | `stock:intraday:AAPL:5min` |
| `metrics:{symbol}` | Stock metadata/metrics | 24 hours | `metrics:TSLA` |
| `screener:{filterHash}` | Screener/filter results | 1 hour | `screener:a1b2c3d4...` |

## ⏱️ TTL (Time-To-Live) Values

- **Daily Data**: 24 hours (86,400 seconds)
  - *Rationale*: Stock daily data doesn't change frequently after market close
- **Intraday Data**: 5 minutes (300 seconds)
  - *Rationale*: More frequent updates needed for intraday trading data
- **Metrics**: 24 hours (86,400 seconds)
  - *Rationale*: Technical metrics and stock metadata update daily
- **Screener Results**: 1 hour (3,600 seconds)
  - *Rationale*: Balance between freshness and API conservation

## 🎯 Key Features

### 1. **Graceful Degradation**
- If Redis is unavailable, the app continues to function normally
- API calls are made directly without caching
- No errors thrown to the user
- Logs warnings but doesn't crash the application

### 2. **Cache-Aside Pattern**
```typescript
// Check cache first
const cachedData = await cacheService.getJSON(cacheKey);
if (cachedData) return cachedData;

// Cache miss - fetch from source
const data = await fetchFromAPI();

// Store in cache for next time
await cacheService.setJSON(cacheKey, data, ttl);
return data;
```

### 3. **Automatic Reconnection**
- Retries up to 3 times with exponential backoff
- Logs connection status changes
- Continues without cache after max retries

### 4. **Optional Cache Logging**
- Enable with `CACHE_LOGGING=true` in `.env`
- Logs cache hits, misses, sets, and deletes
- Useful for debugging and monitoring cache effectiveness

## 🚀 Setup Instructions

### 1. Install Redis Server

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Windows:**
- Use WSL (Windows Subsystem for Linux)
- Or download Redis for Windows from GitHub

### 2. Verify Redis is Running

```bash
redis-cli ping
# Should return: PONG
```

### 3. Configure Environment Variables

Update your `/backend/.env` file (copy from `.env.example` if needed):

```env
# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Or use a connection URL
# REDIS_URL=redis://localhost:6379

# Enable cache logging (optional)
# CACHE_LOGGING=true
```

### 4. Install Dependencies

Dependencies are already installed during this milestone:
```bash
cd backend
npm install ioredis @types/ioredis
```

### 5. Start the Backend

```bash
cd backend
npm run dev
```

You should see:
- `Redis: Connected successfully` (if Redis is running)
- OR `Redis: Initial connection failed (app will continue without cache)` (if Redis is not running)

## 🧪 Testing the Cache

### Test 1: Verify Redis Connection

1. Start Redis: `redis-server`
2. Start the backend: `npm run dev`
3. Check logs for: `Redis: Connected successfully`

### Test 2: Test Cache Hits

1. Enable cache logging in `.env`:
   ```env
   CACHE_LOGGING=true
   ```

2. Make a request to fetch stock data:
   ```bash
   curl http://localhost:5001/api/chart/daily/AAPL
   ```

3. Make the same request again immediately
4. Check the terminal logs:
   - First request: `Cache MISS: stock:daily:AAPL`
   - Second request: `Cache HIT: stock:daily:AAPL`

### Test 3: Test Graceful Degradation

1. Stop Redis: `redis-cli shutdown` or `brew services stop redis`
2. Backend should continue running (check logs)
3. API requests still work (just slower, no caching)
4. No errors thrown to users

### Test 4: Monitor Cache Stats

You can add a cache stats endpoint to monitor performance:

```typescript
// Example: Add to your routes
app.get('/api/cache/stats', async (req, res) => {
  const stats = await cacheService.getStats();
  res.json(stats);
});
```

### Test 5: Clear Cache (if needed)

```bash
# Clear all cache keys
redis-cli FLUSHDB

# Or delete specific patterns
redis-cli KEYS "stock:daily:*"
redis-cli DEL stock:daily:AAPL stock:daily:TSLA
```

## 📊 Expected Performance Improvements

### Without Cache:
- Every request hits Alpha Vantage API
- 25 requests/day limit reached quickly
- ~1-3 second response time (API latency)

### With Cache:
- First request: ~1-3 seconds (cache miss, API call)
- Subsequent requests: ~10-50ms (cache hit, Redis lookup)
- API calls reduced by 80-95% (depending on usage patterns)
- Daily API limit extended significantly

## 🔍 Monitoring Cache Effectiveness

### Using Redis CLI:

```bash
# Check number of keys
redis-cli DBSIZE

# List all keys
redis-cli KEYS "*"

# Check TTL of a specific key
redis-cli TTL stock:daily:AAPL

# Get cache statistics
redis-cli INFO stats

# Monitor cache in real-time
redis-cli MONITOR
```

### Using Cache Logging:

Enable `CACHE_LOGGING=true` and observe:
- Cache hit rate (hits vs misses)
- Most frequently cached symbols
- Cache expiration patterns

## 🚨 Troubleshooting

### Issue: Redis connection refused

**Cause**: Redis server is not running

**Solution**:
```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis-server

# Or run in foreground
redis-server
```

### Issue: Can't connect to Redis (Windows)

**Cause**: Redis doesn't run natively on Windows

**Solution**: Use WSL or Docker:
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Issue: Backend crashes with Redis errors

**Cause**: Unexpected - caching should be gracefully handled

**Solution**:
1. Check the error logs
2. Verify Redis connection settings in `.env`
3. The cache service should handle errors - report as bug if crashes

### Issue: Cache not updating with new data

**Cause**: TTL not expired yet

**Solution**: 
- Wait for TTL to expire
- Or manually clear cache: `redis-cli FLUSHDB`
- Or delete specific key: `redis-cli DEL stock:daily:AAPL`

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | - | Full Redis connection URL (overrides HOST/PORT) |
| `REDIS_HOST` | No | `localhost` | Redis server hostname |
| `REDIS_PORT` | No | `6379` | Redis server port |
| `CACHE_LOGGING` | No | `false` | Enable cache hit/miss logging |

## 🎓 Next Steps

This caching layer is now ready for:
- **Milestone 4.1.2**: Add cache invalidation strategies
- **Milestone 4.1.3**: Add cache warming for popular symbols
- **Milestone 4.2**: Implement rate limiting middleware
- **Milestone 4.3**: Add cache monitoring dashboard

## 📚 Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [ioredis GitHub](https://github.com/redis/ioredis)
- [Cache-Aside Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

---

## ✅ Success Criteria

- [x] Redis client installed (`ioredis`)
- [x] Cache service created with full CRUD operations
- [x] Graceful degradation when Redis unavailable
- [x] Cache-aside pattern implemented in Alpha Vantage service
- [x] Caching added to database queries (screener, metrics)
- [x] Environment variables configured
- [x] Backend runs successfully with/without Redis
- [x] Documentation completed

**Status**: ✅ MILESTONE COMPLETED
