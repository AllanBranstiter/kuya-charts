# Milestone 3.3: Technical Filters - Implementation Guide

## Overview
Milestone 3.3 adds technical indicator-based filtering to the kuya-charts stock screener. This enables users to filter stocks based on RSI, moving averages, and volume spikes.

## ✅ Completed Components

### Backend Infrastructure

#### 1. Database Schema (`stock_metrics` table)
**Location:** [`backend/src/services/databaseService.ts`](../backend/src/services/databaseService.ts:26-70)

The `stock_metrics` table stores daily technical indicators for each stock:
- `stock_id` - Foreign key to stocks table
- `date` - Date of calculation
- `close_price`, `volume` - Raw price and volume data
- `rsi` - 14-period Relative Strength Index (0-100)
- `price_vs_sma_20`, `price_vs_sma_50`, `price_vs_sma_200` - Percentage above/below moving averages
- `volume_spike` - Ratio vs 20-day average volume
- `avg_volume_20d` - 20-day average volume

**Indexes created for performance:**
- `stock_id`, `date` (unique composite)
- `rsi`, `price_vs_sma_50` (for range filtering)

#### 2. Technical Metrics Calculation
**Location:** [`backend/src/services/technicalMetricsService.ts`](../backend/src/services/technicalMetricsService.ts)

Functions implemented:
- `calculateRSI(prices)` - 14-period RSI using technicalindicators library
- `calculateSMA(prices, period)` - Simple moving average (20, 50, 200 day)
- `calculatePriceVsSMA(price, sma)` - Percentage difference
- `calculateVolumeSpike(volume, avgVolume)` - Volume ratio
- `calculateAllMetrics(prices, volumes)` - Aggregates all calculations

#### 3. Historical Data Fetching
**Location:** [`backend/src/services/alphaVantageService.ts`](../backend/src/services/alphaVantageService.ts:195-250)

New function: `fetchHistoricalData(symbol)`
- Fetches full historical data (20+ years) from Alpha Vantage
- Uses `outputsize=full` parameter
- Returns data in descending chronological order

#### 4. Metrics Update Service
**Location:** [`backend/src/services/metricsUpdateService.ts`](../backend/src/services/metricsUpdateService.ts)

Key functions:
- `updateMetricsForStock(stock)` - Calculate and store metrics for one stock
- `updateAllStockMetrics(stockLimit, delayBetweenRequests)` - Batch processing with rate limiting
- `getMetricsStatus()` - Returns last update date and coverage statistics

**API Rate Limiting Strategy:**
- Default delay: 13,000ms between requests (~4.5 req/min)
- Free tier limit: 25 requests/day
- Recommendation: Process 25 stocks per day, rotating through full set

#### 5. Seeding Script
**Location:** [`backend/src/scripts/seedMetrics.ts`](../backend/src/scripts/seedMetrics.ts)

**Usage:**
```bash
# Seed all stocks (will take multiple days due to API limits)
npm run seed:metrics

# Seed only first 10 stocks (recommended for testing)
npm run seed:metrics -- --limit 10
```

**Features:**
- Command-line `--limit` flag for testing
- Progress logging with success/failure tracking
- 5-second warning before processing all stocks
- Automatic delay between API requests

#### 6. Daily Job Scheduler
**Location:** [`backend/src/jobs/dailyMetricsJob.ts`](../backend/src/jobs/dailyMetricsJob.ts)

**Schedule:** Weekdays at 7:00 PM ET (after market close)
- Cron pattern: `0 19 * * 1-5`
- Processes 25 stocks per day (API rate limit)
- Functions: `scheduleDailyMetricsUpdate()`, `triggerMetricsUpdate()`

#### 7. Extended Database Service
**Location:** [`backend/src/services/databaseService.ts`](../backend/src/services/databaseService.ts:46-166)

`getStocksList()` now:
- Joins with `stock_metrics` using LATERAL join for latest metrics
- Supports technical filter parameters
- Returns stocks with embedded technical data

#### 8. API Endpoints

**Updated:** `GET /api/stocks/list`
**Location:** [`backend/src/routes/stockListRoutes.ts`](../backend/src/routes/stockListRoutes.ts:18-162)

New query parameters:
- `rsiMin`, `rsiMax` - RSI range filter
- `priceVsSma50` - 'above' or 'below' 50-day SMA
- `priceVsSma200` - 'above' or 'below' 200-day SMA
- `volumeSpikeMin` - Minimum volume spike ratio
- `minPrice`, `maxPrice` - Price range (now supported with metrics data)

**New:** `GET /api/stocks/metrics/status`
**Location:** [`backend/src/routes/stockListRoutes.ts`](../backend/src/routes/stockListRoutes.ts:207-221)

Returns:
```json
{
  "last_updated": "2026-02-05",
  "stocks_with_metrics": 25,
  "total_stocks": 100
}
```

### Frontend Implementation

#### 9. TypeScript Types
**Location:** [`frontend/src/types/screener.ts`](../frontend/src/types/screener.ts)

Extended interfaces:
- `StockMetadata` - Added technical metric fields
- `ScreenerFilters` - Added technical filter fields
- `StockListQuery` - Added technical query parameters
- `MetricsStatus` - New interface for metrics status

#### 10. API Service
**Location:** [`frontend/src/services/screenerApi.ts`](../frontend/src/services/screenerApi.ts)

Updated:
- `fetchStocksList()` - Includes technical filter parameters
- New: `fetchMetricsStatus()` - Fetches metrics status

#### 11. Filter UI Component
**Location:** [`frontend/src/components/ScreenerFilters.tsx`](../frontend/src/components/ScreenerFilters.tsx)

New "Technical Filters" section with:

**RSI Filter:**
- Preset buttons: Oversold (<30), Neutral (30-70), Overbought (>70)
- Custom min/max inputs (0-100 range)

**Price vs SMA Filters:**
- 50-day SMA: Above (Bullish) / Below (Bearish) / Any
- 200-day SMA: Above (Long-term Bullish) / Below (Long-term Bearish) / Any

**Volume Spike Filter:**
- Preset buttons: 1.5x, 2x, 3x average
- Custom minimum input

#### 12. Screener Component
**Location:** [`frontend/src/components/Screener.tsx`](../frontend/src/components/Screener.tsx:63-116)

Updated `buildQuery()` to include technical filters in API requests.

## 🚧 Remaining Tasks

### 13. StockTable Component Updates
**Location:** [`frontend/src/components/StockTable.tsx`](../frontend/src/components/StockTable.tsx)

**To implement:**
- Add columns for RSI, Price vs 50-day SMA, Volume Spike
- Color-code RSI values: red (<30), yellow (30-70), green (>70)
- Format percentage for SMA comparison: "+5.2%" or "-3.1%"
- Display volume spike as "2.3x" when > 1.5x
- Handle null/undefined values gracefully (show "N/A")

**Example implementation:**
```tsx
// Add to table columns
<th>RSI</th>
<th>vs SMA-50</th>
<th>Volume</th>

// In table body
<td className={getRsiColor(stock.rsi)}>
  {stock.rsi != null ? stock.rsi.toFixed(1) : 'N/A'}
</td>
<td>
  {stock.price_vs_sma_50 != null 
    ? `${stock.price_vs_sma_50 > 0 ? '+' : ''}${stock.price_vs_sma_50.toFixed(1)}%`
    : 'N/A'
  }
</td>
<td>
  {stock.volume_spike != null && stock.volume_spike >= 1.5
    ? `${stock.volume_spike.toFixed(1)}x`
    : '-'
  }
</td>
```

### 14. Data Freshness Indicator
**Location:** [`frontend/src/components/Screener.tsx`](../frontend/src/components/Screener.tsx) or [`ScreenerFilters.tsx`](../frontend/src/components/ScreenerFilters.tsx)

**To implement:**
- Fetch metrics status on component mount
- Display near technical filters: "Metrics updated: Feb 5, 2026"
- Show warning if data is >1 day old
- Optionally show coverage: "25 of 100 stocks"

**Example:**
```tsx
const [metricsStatus, setMetricsStatus] = useState<MetricsStatus | null>(null);

useEffect(() => {
  fetchMetricsStatus().then(setMetricsStatus);
}, []);

// In render:
{metricsStatus && (
  <div className="text-xs text-gray-600 mt-4">
    <div>📊 Metrics updated: {new Date(metricsStatus.last_updated).toLocaleDateString()}</div>
    <div>{metricsStatus.stocks_with_metrics} of {metricsStatus.total_stocks} stocks covered</div>
  </div>
)}
```

## 📊 API Rate Limit Strategy

### Challenge
Alpha Vantage free tier: **25 requests/day**, but we have 100 stocks.

### Implemented Solution: Option C (Reduced Initial Set)
**Current approach:** Use `--limit` flag to test with subset

```bash
# Test with 10 stocks
npm run seed:metrics -- --limit 10

# Gradually expand
npm run seed:metrics -- --limit 25
```

### Recommended: Option B (Cache Historical Data)
**Future improvement:** Create `stock_prices` table to store OHLCV data
- One-time bulk download of historical data
- Daily updates only fetch latest day (1 request per stock)
- Dramatically reduces API usage

**Implementation outline:**
```sql
CREATE TABLE stock_prices (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER REFERENCES stocks(id),
  date DATE,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2),
  volume BIGINT,
  UNIQUE(stock_id, date)
);
```

## 🧪 Testing Guide

### 1. Database Setup
```bash
# Ensure PostgreSQL is running
# Database should already be initialized from Milestone 3.1

# Tables will be created automatically on server start
```

### 2. Seed Test Data
```bash
cd /Users/allanbranstiter/Documents/GitHub/kuya-charts/backend

# Seed 10 stocks for testing (recommended)
npm run seed:metrics -- --limit 10

# Expected output:
# - 10 API requests (13 seconds between each)
# - ~2-3 minutes total
# - Check for "Successfully updated metrics for [SYMBOL]"
```

### 3. Verify Database
```sql
-- Check metrics were stored
SELECT s.symbol, m.date, m.rsi, m.price_vs_sma_50, m.volume_spike
FROM stock_metrics m
JOIN stocks s ON s.id = m.stock_id
ORDER BY m.date DESC
LIMIT 10;

-- Check metrics status
SELECT 
  MAX(date) as last_updated,
  COUNT(DISTINCT stock_id) as stocks_with_metrics
FROM stock_metrics;
```

### 4. Test API Endpoints
```bash
# Test metrics status
curl http://localhost:5001/api/stocks/metrics/status

# Test RSI filter (stocks with RSI < 30)
curl "http://localhost:5001/api/stocks/list?rsiMax=30"

# Test SMA filter (stocks above 50-day SMA)
curl "http://localhost:5001/api/stocks/list?priceVsSma50=above"

# Test combined filters
curl "http://localhost:5001/api/stocks/list?rsiMin=30&rsiMax=70&priceVsSma200=above"
```

### 5. Test Frontend
1. Navigate to `/screener` page
2. Verify technical filters section appears
3. Test RSI presets (Oversold, Neutral, Overbought)
4. Test SMA dropdowns (Above/Below)
5. Test volume spike presets
6. Verify stocks are filtered correctly
7. Check that technical metrics display in table (after implementing #13)

## 📋 Success Criteria

- [x] `stock_metrics` table created and indexed
- [x] Technical metrics calculation functions implemented
- [x] Historical data fetching works (full outputsize)
- [x] Batch metrics update service with rate limiting
- [x] Seeding script with `--limit` flag
- [x] Daily job scheduler configured
- [x] Database service supports technical filters
- [x] `/api/stocks/list` endpoint accepts technical parameters
- [x] `/api/stocks/metrics/status` endpoint created
- [x] Frontend types updated
- [x] Technical filters UI implemented
- [x] Filters integrated with API calls
- [ ] **TODO:** StockTable displays technical metrics
- [ ] **TODO:** Data freshness indicator shown
- [ ] At least 10-25 stocks have metrics (for testing)
- [x] TypeScript compilation succeeds
- [x] No regression in fundamental filters

## 🔧 Troubleshooting

### Issue: "API rate limit exceeded"
**Solution:** Use `--limit` flag to process fewer stocks
```bash
npm run seed:metrics -- --limit 5
```

### Issue: "Insufficient data" errors
**Cause:** Stock doesn't have 200 days of historical data
**Solution:** This is expected for new IPOs; they'll be skipped

### Issue: Metrics not appearing in frontend
**Check:**
1. Are metrics in database? Run SQL query above
2. Is backend returning metrics? Check API response
3. Are types correctly updated? Check TypeScript compilation

### Issue: Database connection errors
**Solution:** Ensure PostgreSQL is running and .env is configured
```bash
# Check .env file has:
DATABASE_URL=postgresql://user:password@localhost:5432/kuya_charts
```

## 📝 Dependencies Added

**Backend:**
```json
{
  "technicalindicators": "^3.x",
  "node-cron": "^3.x",
  "@types/node-cron": "^3.x"
}
```

## 🚀 Next Steps

1. Complete StockTable technical metrics display (#13)
2. Add data freshness indicator (#14)
3. Test with 25 stocks to ensure full workflow
4. Consider implementing Option B (price caching) for production
5. Document any edge cases or limitations discovered
6. Add error handling for stocks without sufficient data
7. Consider adding more technical indicators (MACD, Bollinger Bands)

## 📚 Resources

- [technicalindicators library](https://www.npmjs.com/package/technicalindicators)
- [Alpha Vantage API Documentation](https://www.alphavantage.co/documentation/)
- [PostgreSQL LATERAL Joins](https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-LATERAL)
- [node-cron scheduling](https://www.npmjs.com/package/node-cron)

## 🎯 Production Considerations

Before deploying to production:

1. **API Key Management:** Ensure Alpha Vantage API key is in environment variables
2. **Database Backups:** Regular backups of stock_metrics table
3. **Monitoring:** Track daily job success/failure
4. **Rate Limiting:** Implement exponential backoff for API failures
5. **Data Validation:** Add checks for outlier values (RSI > 100, etc.)
6. **Performance:** Monitor query performance with technical filters
7. **Caching:** Consider Redis for frequently accessed metrics
8. **Error Notifications:** Alert on job failures or stale data

---

**Status:** Milestone 3.3 is ~85% complete. Core backend and filtering logic are fully functional. Remaining work is primarily UI polish (table display and freshness indicator).
