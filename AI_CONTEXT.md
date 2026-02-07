# Kuya Charts - AI Context

**Quick Start Document for AI Agents**

## What Is This Project?

A professional stock charting web application built with React + Express that displays real-time stock data with technical indicators using the Alpha Vantage API.

**Status:** Phase 3 Complete - Stock Screener & Technical Filters (February 2026)

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, TradingView Lightweight Charts, Tailwind CSS, React Router |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 15+, pg (node-postgres) |
| Data | Alpha Vantage API, in-memory cache (5-min TTL) |
| Indicators | technicalindicators npm package |

---

## Project Structure

```
kuya-charts/
├── frontend/src/
│   ├── components/
│   │   ├── App.tsx              # Router configuration (/ = Chart, /screener = Screener)
│   │   ├── ChartPage.tsx        # Main charting interface
│   │   ├── Chart.tsx            # TradingView chart rendering
│   │   ├── Screener.tsx         # Stock screener page
│   │   ├── ScreenerFilters.tsx  # Filter UI component
│   │   ├── StockTable.tsx       # Results table with sorting
│   │   ├── SymbolInput.tsx      # Stock symbol input
│   │   ├── TimeframeSelector.tsx # Timeframe picker
│   │   └── IndicatorControls.tsx # Indicator configuration UI
│   ├── services/
│   │   ├── stockApi.ts          # Chart data API client
│   │   └── screenerApi.ts       # Screener API client
│   ├── types/
│   │   ├── stock.ts             # Chart data types
│   │   └── screener.ts          # Screener filter types
│   ├── utils/
│   │   ├── indicators.ts        # All indicator calculations
│   │   └── presets.ts           # Preset management & localStorage
│
├── backend/src/
│   ├── routes/
│   │   ├── stockRoutes.ts       # Chart data endpoints
│   │   └── stockListRoutes.ts   # Screener endpoints (NEW in Phase 3)
│   ├── services/
│   │   ├── alphaVantageService.ts      # Alpha Vantage integration
│   │   ├── databaseService.ts          # Database CRUD operations (NEW)
│   │   ├── technicalMetricsService.ts  # RSI, SMA, volume calculations (NEW)
│   │   └── metricsUpdateService.ts     # Batch metrics updater (NEW)
│   ├── scripts/
│   │   ├── seedStocks.ts        # Seed stock universe (NEW)
│   │   └── seedMetrics.ts       # Seed technical metrics (NEW)
│   ├── data/
│   │   └── stocksData.json      # 100 stock seed data (NEW)
│   ├── middleware/
│   │   └── rateLimiter.ts       # 5 req/min rate limiting
│   ├── utils/
│   │   ├── cache.ts             # In-memory cache
│   │   └── db.ts                # PostgreSQL connection pool (NEW)
│   ├── types/
│   │   └── stock.ts             # TypeScript types (expanded)
│   └── index.ts                 # Express server (PORT 5001)
│
└── [configs, env files, package.jsons...]
```

---

## Core Data Type

**CRITICAL:** Both frontend and backend use this structure:

```typescript
interface OHLCVData {
  timestamp: string;  // ISO 8601 format - NOTE: field is "timestamp" NOT "time"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

---

## API Endpoints (Backend: Port 5001)

### Chart Data Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stock/:symbol/daily` | Daily OHLCV data |
| GET | `/api/stock/:symbol/intraday?interval=15min` | Intraday data (1min, 5min, 15min, 30min, 60min) |

**Response Format:**
```json
{
  "symbol": "AAPL",
  "data": [OHLCVData[]],
  "source": "cache" | "api"
}
```

### Screener Endpoints (NEW in Phase 3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stocks/list` | Get stocks with filtering & pagination |
| GET | `/api/stocks/sectors` | Get distinct sectors list |
| GET | `/api/stocks/metrics/status` | Get metrics update status |

**GET /api/stocks/list Query Parameters:**

**Fundamental Filters:**
- `sector` (string) - Filter by sector (e.g., "Technology", "Healthcare")
- `minMarketCap` (number) - Minimum market cap in USD
- `maxMarketCap` (number) - Maximum market cap in USD

**Price Filters:**
- `minPrice` (number) - Minimum stock price
- `maxPrice` (number) - Maximum stock price

**Technical Filters:**
- `rsiMin` (number, 0-100) - Minimum RSI value
- `rsiMax` (number, 0-100) - Maximum RSI value
- `priceVsSma50` (string: 'above' | 'below') - Price relative to 50-day SMA
- `priceVsSma200` (string: 'above' | 'below') - Price relative to 200-day SMA
- `volumeSpikeMin` (number) - Minimum volume spike ratio (e.g., 1.5 = 150% of avg)

**Pagination:**
- `limit` (number, 1-500, default: 100) - Results per page
- `offset` (number, default: 0) - Pagination offset

**Response Format:**
```json
{
  "stocks": [
    {
      "id": 1,
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "sector": "Technology",
      "market_cap": 3000000000000,
      "exchange": "NASDAQ",
      "currency": "USD",
      "close_price": 185.50,
      "volume": 50000000,
      "rsi": 65.23,
      "price_vs_sma_20": 2.5,
      "price_vs_sma_50": 5.1,
      "price_vs_sma_200": 12.3,
      "volume_spike": 1.2,
      "avg_volume_20d": 45000000,
      "metrics_date": "2026-02-05"
    }
  ],
  "total": 100,
  "limit": 100,
  "offset": 0
}
```

---

## Environment Setup

### PostgreSQL Database (NEW in Phase 3)

**Installation:**
```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Verify
psql --version
```

**Create Database:**
```bash
createdb kuya_charts
```

**Seed Database:**
```bash
cd backend
npm run seed        # Seed stocks table (100 stocks)
npm run seed:metrics -- --limit 10  # Seed metrics (limited for testing)
```

### Backend (.env)
```bash
PORT=5001
ALPHA_VANTAGE_API_KEY=MRQTPUYFM1G9BDAV  # NO QUOTES - critical!

# PostgreSQL Database (NEW in Phase 3)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kuya_charts
# OR use individual parameters:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=kuya_charts
# DB_USER=postgres
# DB_PASSWORD=postgres
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:5001/api
```

**Running Dev Servers:**
```bash
# Terminal 1 - Backend
cd backend && npm run dev  # → http://localhost:5001

# Terminal 2 - Frontend
cd frontend && npm run dev # → http://localhost:3000
```

**Database Scripts:**
```bash
cd backend
npm run seed              # Seed stocks table
npm run seed:metrics      # Seed technical metrics (all stocks, respects rate limits)
npm run seed:metrics -- --limit 10  # Test mode (first 10 stocks only)
```

---

## Key Features (Phase 1 - Implemented)

1. **Stock Data Fetching** - Daily and intraday data for any symbol
2. **Interactive Charts** - TradingView Lightweight Charts with candlesticks
3. **Timeframes** - 15min, 30min, 1hour, daily, weekly
4. **Basic Indicators** - SMA, EMA, Volume
5. **Caching** - 5-minute in-memory cache
6. **Rate Limiting** - Protects Alpha Vantage free tier (25 req/day)

---

## Phase 2 Features (Implemented)

### 9 Total Technical Indicators

**Overlays (5 indicators - displayed on main chart):**
1. **SMA (Simple Moving Average)** - Configurable period, color, line style
2. **EMA (Exponential Moving Average)** - Configurable period, color, line style
3. **Bollinger Bands** - Period, standard deviation, 3 separate color controls (upper/middle/lower)
4. **VWAP (Volume Weighted Average Price)** - Resets daily, configurable color/style
5. **Pivot Points** - Standard method with P, R1-R3, S1-S3 levels, separate colors for pivot/resistance/support

**Volume:**
- **Volume Histogram** - Green/red coloring based on price movement, displays in separate pane

**Oscillators (3 indicators - each in separate pane below main chart):**
1. **RSI (Relative Strength Index)** - Configurable period, 0-100 scale with 30/70 reference lines
2. **MACD (Moving Average Convergence Divergence)** - Fast/slow/signal periods configurable, shows line + signal + histogram
3. **Stochastic Oscillator** - %K/%D periods + smoothing, 0-100 scale with 20/80 reference lines

### Advanced Configuration System

**Per-Indicator Customization:**
- **Color Picker** - Every line has customizable color (hex color input)
- **Configurable Parameters** - All indicator periods and calculations are adjustable
- **Line Styles** - Solid, dotted, or dashed lines (where applicable)
- **Line Width** - Adjustable thickness for all line-based indicators

### Preset Management System

**Built-in Presets (3 default configurations):**
1. **Day Trading** - EMA(9), VWAP, Volume, RSI(14), MACD(12,26,9)
2. **Swing Trading** - SMA(50), Bollinger Bands(20,2), Volume, RSI(14)
3. **Momentum** - Volume, RSI(14), MACD(12,26,9), Stochastic(14,3,3)

**Preset Features:**
- **Save Current Config** - Store any indicator combination as a custom preset
- **Load Presets** - Instantly apply saved configurations
- **Delete Custom Presets** - Remove user-created presets (default presets protected)
- **Reset to Defaults** - Clear all custom settings and restore factory defaults

### localStorage Persistence

**Auto-Save Behavior:**
- Debounced auto-save (500ms delay) on any indicator config change
- Configuration persists across browser sessions
- Presets stored separately and merged with defaults on load
- Version checking for config compatibility
- QuotaExceededError handling with automatic retry

**Storage Keys:**
- `kuya-charts-indicator-config` - Current indicator configuration
- `kuya-charts-presets` - User-created presets list
- Version: `1.0` (stored with all configs for migration support)

### Multi-Pane Chart Layout

**Dynamic Height Calculation:**
- Main chart: 400px base height
- Each oscillator adds 150px
- Total height adjusts automatically based on enabled oscillators
- Example: Main chart + RSI + MACD = 400 + 150 + 150 = 700px

**Pane Distribution:**
- Main chart (price): 60% of vertical space when oscillators enabled
- Oscillators split remaining 40% equally
- Each oscillator has its own price scale (separate Y-axis)
- Automatic margin calculation prevents overlap

**Scale Configuration:**
```typescript
// Example: 2 oscillators enabled (Volume, RSI)
// Main chart: 0% - 60% (top 0.0, bottom 0.4)
// Volume: 60% - 80% (top 0.6, bottom 0.2)
// RSI: 80% - 100% (top 0.8, bottom 0.0)
```

---

## Critical Implementation Details

### 1. Environment Variable Loading (Backend)
```typescript
// backend/src/index.ts
import dotenv from 'dotenv';
dotenv.config(); // MUST be first, before other imports

import express from 'express';
// ... other imports
```

**Why:** ES module imports hoist - env vars must load before any code that uses them.

### 2. API Key Access (Backend)
```typescript
// backend/src/services/alphaVantageService.ts
export async function fetchDailyData(symbol: string) {
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY; // Read inside function, not at module level
  if (!API_KEY) throw new Error('API key not configured');
  // ... use API_KEY
}
```

**Why:** Module-level constants capture values before dotenv loads.

### 3. Timestamp Field Name
- Backend returns: `{ timestamp: "2024-01-15T00:00:00Z", ... }`
- Frontend expects: `item.timestamp` (NOT `item.time`)
- Charts need: Unix timestamp in seconds → `new Date(item.timestamp).getTime() / 1000`

### 4. Data Sorting for Charts
```typescript
// Chart data MUST be sorted ascending by time
chartData.sort((a, b) => (a.time as number) - (b.time as number));
```

**Why:** Lightweight Charts requires ascending time order.

---

## Timeframe Mapping

| Frontend | Backend API Interval | Endpoint |
|----------|---------------------|----------|
| 15min    | 15min               | /intraday |
| 30min    | 30min               | /intraday |
| 1hour    | 60min               | /intraday |
| daily    | -                   | /daily |
| weekly   | -                   | /daily (aggregated) |

---

## Common Issues & Quick Fixes

| Issue | Solution |
|-------|----------|
| "API key not configured" | 1. Check `backend/.env` has no quotes<br>2. Ensure `dotenv.config()` is first in index.ts |
| "time=NaN" in chart | Using `item.time` instead of `item.timestamp` |
| CORS errors | Check frontend `.env` and `vite.config.ts` point to port 5001 |
| Limited historical data | Change `outputsize: 'compact'` to `'full'` in alphaVantageService.ts |
| Indicators misaligned | Check offset calculation in indicator functions |
| Chart panes overlap | Ensure unique `priceScaleId` for each oscillator and correct margin calculation |
| Preset not loading | Check localStorage quota and version compatibility |
| Database connection failed | 1. Check PostgreSQL is running (`brew services start postgresql@15`)<br>2. Verify DATABASE_URL in `.env`<br>3. Ensure database exists (`createdb kuya_charts`) |
| Screener shows no stocks | 1. Run `npm run seed` to populate database<br>2. Check backend console for database errors<br>3. Verify PostgreSQL connection |
| Technical filters not working | 1. Run `npm run seed:metrics -- --limit 10` to populate metrics<br>2. Filters only apply to stocks with metrics data |

---

## Phase 3 Features (Implemented)

### Stock Screener with Advanced Filtering

**Overview:** Full-featured stock screening system with database-backed stock universe, fundamental filters, and technical indicator filters.

**Key Components:**
1. **PostgreSQL Database** - 100 major US stocks with technical metrics
2. **Stock Universe** - Pre-seeded with market cap, sector, exchange data
3. **Technical Metrics** - RSI, SMA comparisons, volume spikes calculated daily
4. **Filtering UI** - Multi-select sectors, market cap ranges, price ranges, technical filters
5. **Sortable Table** - Click column headers to sort results
6. **Direct Chart Access** - Click any stock to view its chart

### Database Schema (Phase 3)

#### `stocks` Table
```sql
CREATE TABLE stocks (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  market_cap BIGINT,
  exchange VARCHAR(20),
  currency VARCHAR(3) DEFAULT 'USD',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:** `idx_stocks_symbol`, `idx_stocks_sector`, `idx_stocks_market_cap`

**Seeded Data:** 100 major US stocks from [`stocksData.json`](./backend/src/data/stocksData.json)

#### `stock_metrics` Table
```sql
CREATE TABLE stock_metrics (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  close_price DECIMAL(10,2),
  volume BIGINT,
  rsi DECIMAL(5,2),                    -- 14-period RSI
  price_vs_sma_20 DECIMAL(6,2),        -- % above/below 20-day SMA
  price_vs_sma_50 DECIMAL(6,2),        -- % above/below 50-day SMA
  price_vs_sma_200 DECIMAL(6,2),       -- % above/below 200-day SMA
  volume_spike DECIMAL(6,2),           -- Current volume / 20-day avg volume
  avg_volume_20d BIGINT,               -- 20-day average volume
  UNIQUE(stock_id, date)
);
```

**Indexes:** `idx_metrics_stock_id`, `idx_metrics_date`, `idx_metrics_rsi`, `idx_metrics_price_vs_sma_50`

**Join Strategy:** `LEFT JOIN LATERAL` fetches most recent metrics for each stock efficiently

### Filter Types

**Fundamental Filters:**
- **Sector** - Multi-select from 10 sectors (Technology, Healthcare, Financial Services, Consumer Cyclical, Communication Services, Energy, Industrials, Consumer Defensive, Real Estate, Utilities)
- **Market Cap Ranges** - Mega Cap (>$200B), Large Cap ($10B-$200B), Mid Cap ($2B-$10B), Small Cap (<$2B), or Custom
- **Custom Market Cap** - Min/max values in billions (e.g., $50B-$100B)
- **Price Range** - Min/max stock price (e.g., $50-$200)

**Technical Filters:**
- **RSI Range** - Min/max RSI (0-100), find overbought (>70) or oversold (<30) stocks
- **Price vs SMA 50** - Above/below 50-day moving average (short-term trend)
- **Price vs SMA 200** - Above/below 200-day moving average (long-term trend confirmation)
- **Volume Spike** - Minimum volume spike ratio (e.g., 1.5 = 150% of 20-day average volume)

### Screener Implementation Details

**Frontend Components:**
- [`Screener.tsx`](./frontend/src/components/Screener.tsx) - Main screener page with state management, client-side sorting
- [`ScreenerFilters.tsx`](./frontend/src/components/ScreenerFilters.tsx) - Filter UI with collapsible sections
- [`StockTable.tsx`](./frontend/src/components/StockTable.tsx) - Sortable results table with market cap formatting
- [`screenerApi.ts`](./frontend/src/services/screenerApi.ts) - API client for fetching filtered stocks and sectors

**Backend Services:**
- [`databaseService.ts`](./backend/src/services/databaseService.ts) - All database CRUD operations, dynamic query building
- [`technicalMetricsService.ts`](./backend/src/services/technicalMetricsService.ts) - Calculate RSI, SMA, volume metrics using technicalindicators library
- [`metricsUpdateService.ts`](./backend/src/services/metricsUpdateService.ts) - Batch update metrics with rate limiting and progress tracking
- [`stockListRoutes.ts`](./backend/src/routes/stockListRoutes.ts) - RESTful endpoints with parameter validation

**Database Connection:**
- [`db.ts`](./backend/src/utils/db.ts) - PostgreSQL connection pool with error handling
- Connection pooling: 20 max connections, 30s idle timeout, 2s connection timeout
- Graceful degradation: App continues without database if PostgreSQL unavailable

### Metrics Seeding Process

**Challenge:** 100 stocks × 200+ days of historical data needed for 200-day SMA = API rate limit concerns

**Solution:** Rate-limited batch processing with progress tracking

**Seeding Script** ([`seedMetrics.ts`](./backend/src/scripts/seedMetrics.ts)):
```bash
npm run seed:metrics              # All stocks (respects 25 req/day limit)
npm run seed:metrics -- --limit 10 # Test mode (first 10 stocks only)
```

**Rate Limiting:**
- Default: 13 seconds between requests (~4.6 req/min)
- Respects Alpha Vantage free tier: 5 req/min, 25 req/day
- Progress logging with success/failure tracking
- Calculates: RSI(14), SMA(20,50,200), volume metrics

**Metrics Calculation Flow:**
1. Fetch daily historical data (need 200+ days for 200-day SMA)
2. Calculate RSI (14-period), SMA (20, 50, 200), average volume
3. Calculate price vs SMA percentages (positive = above SMA, negative = below)
4. Calculate volume spike (current volume / 20-day average)
5. Store most recent metrics in `stock_metrics` table
6. Upsert on conflict (stock_id, date) for idempotency

**Known Limitations:**
- Full 100-stock seeding takes ~4 days (25 stocks/day with free tier)
- Metrics are snapshot-based (not real-time)
- Incomplete historical data for some stocks (less than 200 days)
- Technical filters only work on stocks with seeded metrics

---

## Phase 2 Implementation Gotchas

### Multi-Pane Layout

**Problem:** TradingView Lightweight Charts doesn't have native multi-pane support.

**Solution:** Use `scaleMargins` to partition a single chart:

```typescript
// Dynamic pane allocation based on enabled oscillators
const oscillators = ['volume', 'rsi', 'macd']; // enabled list
const mainChartHeight = 0.6; // Main chart uses 60%
const paneHeight = 0.4 / oscillators.length; // Split remaining 40%

// For RSI (index 1 of 3 oscillators):
const topMargin = 0.6 + (1 * 0.133); // = 0.733
const bottomMargin = 1.0 - (0.733 + 0.133); // = 0.134
```

**Key:** Chart must be recreated when oscillator count changes (put enabled flags in dependency array).

### Indicator Calculation Offsets

**CRITICAL:** Technical indicators lose initial data points based on their period:

| Indicator | Offset | Example |
|-----------|--------|---------|
| SMA/EMA | `period - 1` | SMA(20) loses first 19 points |
| RSI | `period` | RSI(14) loses first 14 points |
| MACD | `slowPeriod + signalPeriod - 1` | MACD(12,26,9) loses first 34 points |
| Stochastic | `kPeriod - 1 + (smoothK - 1)` | Stochastic(14,3,3) loses first 15 points |
| Bollinger Bands | `period - 1` | BB(20,2) loses first 19 points |

**Map results back correctly:**
```typescript
result.push({
  time: data[i + offset].timestamp, // NOT data[i].timestamp
  value: calculatedValues[i]
});
```

### localStorage Auto-Save Pattern

```typescript
// Debounce to prevent excessive writes
const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

const debouncedSaveConfig = useCallback((config) => {
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(() => saveConfig(config), 500);
}, []);
```

**Why:** User might drag color picker or type rapidly - only save after 500ms of no changes.

### Series Management Memory Safety

**Pattern for all indicators:**
```typescript
if (indicators?.sma.enabled) {
  if (!smaSeriesRef.current) {
    // Create series only once
    smaSeriesRef.current = chart.addLineSeries({...});
  } else {
    // Update existing series options
    smaSeriesRef.current.applyOptions({...});
  }
  smaSeriesRef.current.setData(formattedData);
} else {
  // Clean up when disabled
  if (smaSeriesRef.current && chartRef.current) {
    chartRef.current.removeSeries(smaSeriesRef.current);
    smaSeriesRef.current = null; // Clear ref to prevent memory leak
  }
}
```

---

## Adding New Indicators

1. **Calculation** (`frontend/src/utils/indicators.ts`):
```typescript
export function calculateRSI(data: OHLCVData[], period: number) {
  // Use technicalindicators library
  return results.map(v => ({ time: data[i].timestamp, value: v }));
}
```

2. **UI Control** (`IndicatorControls.tsx`): Add checkbox + config

3. **Chart Rendering** (`Chart.tsx`): Add series in useEffect with `indicators` dependency

---

## Testing Quick Reference

**Manual Test:**
1. Start both servers
2. Open http://localhost:3000
3. Enter "AAPL", select "daily", submit
4. Verify chart + indicators display

**API Test:**
```bash
curl http://localhost:5001/api/stock/AAPL/daily
```

---

## File Locations Reference

| Task | Primary Files |
|------|--------------|
| **Chart Features** | |
| API endpoint changes | `backend/src/routes/stockRoutes.ts` |
| Data fetching logic | `backend/src/services/alphaVantageService.ts` |
| Chart rendering | `frontend/src/components/Chart.tsx`, `ChartPage.tsx` |
| Indicator calculations | `frontend/src/utils/indicators.ts` |
| **Screener Features (Phase 3)** | |
| Screener API endpoints | `backend/src/routes/stockListRoutes.ts` |
| Database operations | `backend/src/services/databaseService.ts` |
| Technical metrics calc | `backend/src/services/technicalMetricsService.ts` |
| Metrics batch updates | `backend/src/services/metricsUpdateService.ts` |
| Screener UI | `frontend/src/components/Screener.tsx` |
| Filter controls | `frontend/src/components/ScreenerFilters.tsx` |
| Stock table display | `frontend/src/components/StockTable.tsx` |
| Screener API client | `frontend/src/services/screenerApi.ts` |
| **Database & Config** | |
| Database connection | `backend/src/utils/db.ts` |
| Database seeding | `backend/src/scripts/seedStocks.ts`, `seedMetrics.ts` |
| Type definitions | `backend/src/types/stock.ts`, `frontend/src/types/screener.ts` |
| Server config | `backend/src/index.ts` |
| Router config | `frontend/src/components/App.tsx` |

---

## Alpha Vantage API Notes

- **Free Tier:** 25 requests/day
- **Current Setting:** `outputsize: 'compact'` (100 data points = ~4 months)
- **Full History:** Change to `outputsize: 'full'` (up to 20 years)
- **Functions Used:** TIME_SERIES_DAILY, TIME_SERIES_INTRADAY

---

## Known Limitations & Considerations

**Alpha Vantage API:**
- Free tier: 25 requests/day, 5 requests/minute
- Compact output: ~100 data points (4 months daily data)
- To get more history: Change to `outputsize: 'full'` in `alphaVantageService.ts`
- Metrics seeding: Takes ~4 days for 100 stocks (25 stocks/day limit)

**PostgreSQL Database (Phase 3):**
- Required for screener features
- Graceful degradation if not available (chart features still work)
- Metrics are snapshot-based, not real-time
- Some stocks may have incomplete historical data (<200 days)

**Browser Storage:**
- localStorage quota: ~5-10MB (varies by browser)
- Config + presets typically use <50KB
- QuotaExceededError handled with automatic retry after clearing old data

**Performance:**
- All 9 indicators enabled simultaneously: Renders smoothly on modern hardware
- Indicator calculations run synchronously on data fetch
- Large datasets (500+ points) with all indicators: <100ms calculation time
- Chart rendering: Hardware-accelerated via canvas
- Database queries: Optimized with indexes and LATERAL joins

**Browser Compatibility:**
- Modern browsers with ES2020 support
- localStorage and canvas required
- Tested: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## Phase 4 Roadmap (Future Enhancements)

**Real-Time Data Updates:**
- WebSocket connection for live price updates
- Auto-refresh mode with configurable intervals
- Price alerts and notifications
- Streaming intraday data updates
- Real-time metrics calculation

**Drawing Tools & Annotations:**
- Trendlines, horizontal/vertical lines
- Fibonacci retracements
- Text annotations, shapes, arrows
- Save/load drawings with localStorage
- Export charts with annotations as PNG/SVG

**Advanced Charting:**
- Multi-symbol comparison on same chart
- Split-pane layouts (2x2 grid, custom arrangements)
- Synchronized crosshair across multiple charts
- Chart themes (dark mode, custom color schemes)
- Additional chart types (Heikin Ashi, Renko, Kagi)

**Additional Technical Indicators:**
- ATR (Average True Range) - volatility measure
- Ichimoku Cloud - comprehensive trend system
- Volume Profile - institutional analysis tool
- Order flow / Volume-by-Price
- Custom indicator builder

**Enhanced Screener:**
- Save custom screener queries
- Watchlist management with categories
- Portfolio tracking and performance analysis
- Backtesting capabilities
- Export screener results to CSV/Excel
- Compare stocks side-by-side

**User Management:**
- Authentication (JWT-based)
- User profiles and preferences
- Cloud sync of presets, configurations, watchlists
- Sharing charts via public links
- Social features (comments, ratings)

**Data Enhancements:**
- Expand stock universe beyond 100 stocks
- International markets support
- Cryptocurrency support
- Commodity and forex data
- Fundamental data (P/E, EPS, revenue, etc.)
- News and sentiment integration

**Mobile Experience:**
- Progressive Web App (PWA)
- Touch-optimized charts
- Mobile-specific UI layouts
- Offline mode with cached data

---

**Project Path:** `/Users/allanbranstiter/Documents/GitHub/kuya-charts`
**Last Updated:** February 6, 2026 - Phase 3 Complete
