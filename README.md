# Kuya Charts

A professional stock charting and screening web application with real-time data visualization, advanced technical indicators, and database-backed stock filtering, built with React, TypeScript, PostgreSQL, and TradingView's Lightweight Charts library.

![Project Status](https://img.shields.io/badge/status-Phase%203%20Complete-success)
![License](https://img.shields.io/badge/license-ISC-blue)

---

## 🎯 Features

### Phase 1 (Complete)
- ✅ **Real-time Stock Data** - Fetch daily and intraday price data via Alpha Vantage API
- ✅ **Interactive Charts** - Professional candlestick charts with TradingView Lightweight Charts
- ✅ **Multiple Timeframes** - 15min, 30min, 1hour, daily, weekly intervals
- ✅ **Basic Technical Indicators** - SMA, EMA, Volume histogram
- ✅ **Smart Caching** - 5-minute in-memory cache to reduce API calls
- ✅ **Rate Limiting** - Automatic throttling to respect API limits

### Phase 2 (Complete) ⭐ NEW
- ✅ **9 Advanced Technical Indicators**
  - **Overlays:** SMA, EMA, Bollinger Bands, VWAP, Pivot Points, Volume
  - **Oscillators:** RSI, MACD, Stochastic (each in separate pane)
- ✅ **Comprehensive Customization**
  - Color pickers for every indicator line
  - Adjustable periods and calculation parameters
  - Line style controls (solid, dotted, dashed)
  - Line width customization
- ✅ **Preset System**
  - 3 built-in trading presets (Day Trading, Swing Trading, Momentum)
  - Save custom indicator configurations
  - Load/delete presets with one click
  - Reset to factory defaults
- ✅ **localStorage Persistence**
  - Auto-save configuration (debounced)
  - Settings persist across browser sessions
  - Version-controlled storage format
- ✅ **Multi-Pane Chart Layout**
  - Dynamic height adjustment based on enabled oscillators
  - Separate Y-axis scales for each oscillator
  - Automatic pane distribution (60% main chart, 40% oscillators)

### Phase 3 (Complete) ⭐ NEW
- ✅ **Stock Screener**
  - Browse 100 major US stocks from database
  - Advanced filtering by fundamental and technical criteria
  - Sortable results table with real-time data
  - Click any stock to view its chart
- ✅ **PostgreSQL Database Integration**
  - Persistent stock universe with metadata (symbol, name, sector, market cap, exchange)
  - Technical metrics storage (RSI, SMA comparisons, volume spikes)
  - Optimized queries with indexes and connection pooling
  - Graceful degradation (app works without database)
- ✅ **Fundamental Filters**
  - Sector filtering (10 sectors: Technology, Healthcare, Financial Services, etc.)
  - Market cap ranges (Mega Cap >$200B, Large Cap $10B-$200B, etc.)
  - Custom market cap range (min/max in billions)
  - Price range filtering (min/max stock price)
- ✅ **Technical Filters**
  - RSI range (0-100, find overbought/oversold stocks)
  - Price vs 50-day SMA (above/below, short-term trend)
  - Price vs 200-day SMA (above/below, long-term trend)
  - Volume spike detection (stocks with unusual volume)
- ✅ **Automated Metrics Calculation**
  - Backend calculates RSI, SMA (20/50/200), volume metrics
  - Rate-limited batch processing (respects API limits)
  - Seeding scripts with progress tracking
  - Daily snapshot storage for historical comparison

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18 or higher
- **npm** or **yarn**
- **PostgreSQL** 15+ (for stock screener features)
- **Alpha Vantage API Key** (free at https://www.alphavantage.co/support/#api-key)

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd /Users/allanbranstiter/Documents/GitHub/kuya-charts
   ```

2. **Install PostgreSQL** (for Phase 3 screener features)
   ```bash
   # macOS (Homebrew)
   brew install postgresql@15
   brew services start postgresql@15
   
   # Verify installation
   psql --version
   ```
   
   **Note:** Chart features work without PostgreSQL. Screener requires database.

3. **Create the database**
   ```bash
   createdb kuya_charts
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Configure environment variables**

   **Backend** (`backend/.env`):
   ```bash
   PORT=5001
   ALPHA_VANTAGE_API_KEY=your_api_key_here
   
   # PostgreSQL Database (Phase 3 - Required for screener)
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kuya_charts
   # OR use individual parameters:
   # DB_HOST=localhost
   # DB_PORT=5432
   # DB_NAME=kuya_charts
   # DB_USER=postgres
   # DB_PASSWORD=postgres
   ```
   ⚠️ **Important:** Do not use quotes around the API key!

   **Frontend** (`frontend/.env`):
   ```bash
   VITE_API_BASE_URL=http://localhost:5001/api
   ```

6. **Seed the database** (for screener features)
   ```bash
   cd backend
   
   # Seed stock universe (100 stocks)
   npm run seed
   
   # Seed technical metrics (optional, for technical filters)
   # Test mode (first 10 stocks only - recommended)
   npm run seed:metrics -- --limit 10
   
   # Full mode (all 100 stocks - takes ~4 days due to API rate limits)
   # npm run seed:metrics
   ```

7. **Start development servers**
   ```bash
   # Option 1: Start both servers together (from root)
   npm run dev

   # Option 2: Start separately
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

8. **Open the application**
   - Frontend: http://localhost:3000
   - Stock Screener: http://localhost:3000/screener
   - Backend API: http://localhost:5001

---

## 📖 How to Use

### Basic Stock Charts

1. **Enter a stock symbol** (e.g., AAPL, MSFT, GOOGL) in the search box
2. **Select a timeframe** (15min, 30min, 1hour, daily, weekly)
3. **Click "Fetch Data"** to load the chart

### Using Technical Indicators

#### Enabling Indicators
1. **After loading a chart**, the indicator panel appears below the input controls
2. **Expand sections** by clicking "Overlays" or "Oscillators (Separate Panes)"
3. **Check the box** next to any indicator to enable it
4. **Adjust parameters** like period, colors, and line styles

#### Indicator Categories

**Overlays** (displayed on main price chart):
- **SMA** - Simple Moving Average, tracks trend
- **EMA** - Exponential Moving Average, more responsive than SMA
- **Bollinger Bands** - Volatility indicator with upper/middle/lower bands
- **VWAP** - Volume Weighted Average Price, institutional trader favorite
- **Pivot Points** - Support and resistance levels (P, R1-R3, S1-S3)
- **Volume** - Trading volume histogram (green=up, red=down)

**Oscillators** (each in separate pane below chart):
- **RSI** - Relative Strength Index (0-100), overbought/oversold indicator
- **MACD** - Moving Average Convergence Divergence, momentum and trend
- **Stochastic** - %K/%D oscillator (0-100), momentum indicator

### Using the Stock Screener (Phase 3)

1. **Navigate to the screener**
   - Click "Go to Screener" button in the header, or
   - Visit http://localhost:3000/screener directly

2. **Apply Filters**
   - **Sectors:** Click to select one or more sectors (Technology, Healthcare, etc.)
   - **Market Cap:** Choose a range (Mega/Large/Mid/Small Cap) or enter custom values
   - **Price Range:** Set minimum and maximum stock prices
   - **Technical Filters:**
     - **RSI Range:** Find overbought (>70) or oversold (<30) stocks
     - **Price vs SMA:** Filter stocks above/below moving averages
     - **Volume Spike:** Find stocks with unusual trading volume

3. **Sort Results**
   - Click any column header to sort (Symbol, Name, Sector, Market Cap, Exchange)
   - Click again to reverse sort direction

4. **View Stock Charts**
   - Click any stock row to navigate to its chart with all indicators
   - Chart opens with the selected stock symbol pre-loaded

5. **Clear Filters**
   - Click "Clear Filters" button to reset all filters to default

### Using Presets

#### Load a Built-in Preset
1. Click the **"Load Preset"** dropdown in the indicator panel
2. Select from:
   - **Day Trading** - EMA(9), VWAP, Volume, RSI, MACD
   - **Swing Trading** - SMA(50), Bollinger Bands, Volume, RSI
   - **Momentum** - Volume, RSI, MACD, Stochastic
3. All indicators apply instantly with optimized settings

#### Save a Custom Preset
1. Configure indicators to your preference
2. Click **"Save Preset"** button
3. Enter a name for your preset
4. Click "Save"
5. Your preset appears in the dropdown list

#### Delete a Custom Preset
1. Select your custom preset from the dropdown
2. Click the **"Delete"** button that appears
3. Confirm deletion (default presets cannot be deleted)

#### Reset to Defaults
1. Click **"Reset"** button
2. Confirm to restore all indicators to factory settings
3. All custom presets are preserved

### Configuration Persistence

Your indicator settings automatically save to localStorage:
- **Auto-save** triggers 500ms after your last change
- **Settings persist** when you close and reopen the browser
- **Presets sync** across tabs in the same browser
- **Version control** ensures compatibility with updates

---

## 🏗️ Technical Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | UI framework with type safety |
| | Vite | Fast development build tool |
| | React Router | Client-side routing (Chart/Screener pages) |
| | TradingView Lightweight Charts | Professional chart rendering |
| | Tailwind CSS | Utility-first styling |
| **Backend** | Node.js + Express | REST API server |
| | TypeScript | Type-safe backend code |
| | Axios | HTTP client for external APIs |
| **Database** | PostgreSQL 15+ | Persistent stock universe & metrics |
| | pg (node-postgres) | PostgreSQL client with connection pooling |
| **Data Source** | Alpha Vantage API | Real-time and historical stock data |
| **Indicators** | technicalindicators npm | Technical analysis calculations |
| **Storage** | localStorage | Client-side persistence (presets, config) |
| | In-memory cache | Backend response caching (5min TTL) |

### Project Structure

```
kuya-charts/
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── App.tsx          # Main application component
│   │   │   ├── Chart.tsx        # Chart rendering & indicator display
│   │   │   ├── IndicatorControls.tsx  # Indicator configuration UI
│   │   │   ├── SymbolInput.tsx  # Stock symbol search
│   │   │   └── TimeframeSelector.tsx  # Timeframe picker
│   │   ├── services/
│   │   │   └── stockApi.ts      # Backend API client
│   │   ├── utils/
│   │   │   ├── indicators.ts    # All indicator calculations
│   │   │   └── presets.ts       # Preset & localStorage management
│   │   └── types/
│   │       └── stock.ts         # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── stockRoutes.ts   # API endpoints
│   │   ├── services/
│   │   │   └── alphaVantageService.ts  # External API integration
│   │   ├── middleware/
│   │   │   └── rateLimiter.ts   # Rate limiting (5 req/min)
│   │   ├── utils/
│   │   │   └── cache.ts         # In-memory cache
│   │   └── index.ts             # Express server entry point
│   └── package.json
│
└── README.md (you are here)
```

### API Endpoints

#### Chart Data Endpoints

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| GET | `/api/health` | Health check | None |
| GET | `/api/stock/:symbol/daily` | Daily OHLCV data | None |
| GET | `/api/stock/:symbol/intraday` | Intraday OHLCV data | `interval` (1min, 5min, 15min, 30min, 60min) |

**Response Format:**
```json
{
  "symbol": "AAPL",
  "data": [
    {
      "timestamp": "2024-01-15T00:00:00Z",
      "open": 185.00,
      "high": 186.50,
      "low": 184.50,
      "close": 186.00,
      "volume": 50000000
    }
  ],
  "source": "cache"
}
```

#### Screener Endpoints (Phase 3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stocks/list` | Get filtered stocks with pagination |
| GET | `/api/stocks/sectors` | Get distinct sectors list |
| GET | `/api/stocks/metrics/status` | Get metrics update status |

**GET /api/stocks/list Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `sector` | string | Filter by sector | `Technology` |
| `minMarketCap` | number | Min market cap (USD) | `10000000000` (10B) |
| `maxMarketCap` | number | Max market cap (USD) | `500000000000` (500B) |
| `minPrice` | number | Minimum stock price | `50` |
| `maxPrice` | number | Maximum stock price | `200` |
| `rsiMin` | number | Minimum RSI (0-100) | `30` |
| `rsiMax` | number | Maximum RSI (0-100) | `70` |
| `priceVsSma50` | string | 'above' or 'below' | `above` |
| `priceVsSma200` | string | 'above' or 'below' | `above` |
| `volumeSpikeMin` | number | Min volume spike ratio | `1.5` |
| `limit` | number | Results per page (1-500) | `100` |
| `offset` | number | Pagination offset | `0` |

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

**Example Requests:**
```bash
# Get Technology stocks with high RSI (overbought)
curl "http://localhost:5001/api/stocks/list?sector=Technology&rsiMin=70"

# Get stocks above both 50-day and 200-day SMAs (strong uptrend)
curl "http://localhost:5001/api/stocks/list?priceVsSma50=above&priceVsSma200=above"

# Get stocks with volume spike (unusual activity)
curl "http://localhost:5001/api/stocks/list?volumeSpikeMin=2.0"

# Get Large Cap Healthcare stocks
curl "http://localhost:5001/api/stocks/list?sector=Healthcare&minMarketCap=10000000000&maxMarketCap=200000000000"
```

---

## ⚙️ Configuration

### Backend Configuration

**Environment Variables** (`backend/.env`):
```bash
PORT=5001
ALPHA_VANTAGE_API_KEY=your_actual_api_key

# PostgreSQL Database (Phase 3)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kuya_charts
# OR individual parameters:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=kuya_charts
# DB_USER=postgres
# DB_PASSWORD=postgres
```

**Database Configuration:**
- Connection pooling: 20 max connections, 30s idle timeout
- Automatic schema initialization on startup
- Graceful degradation: App runs without database (chart features only)
- Indexes optimized for filtering queries

**Rate Limiting:**
- Max 5 requests per minute per IP
- Protects against API quota exhaustion
- Configurable in `backend/src/middleware/rateLimiter.ts`

**Caching Strategy:**
- In-memory cache with 5-minute TTL
- Reduces API calls for repeated requests
- Cache key: `{symbol}:{timeframe}`

### Frontend Configuration

**Environment Variables** (`frontend/.env`):
```bash
VITE_API_BASE_URL=http://localhost:5001/api
```

**localStorage Keys:**
- `kuya-charts-indicator-config` - Current indicator settings
- `kuya-charts-presets` - User-created presets
- Storage version: `1.0` (for future migrations)

---

## 📊 Available Scripts

### Root Level (Monorepo)
```bash
npm run dev              # Run both frontend and backend
npm run dev:frontend     # Run only frontend
npm run dev:backend      # Run only backend
npm run build            # Build both for production
npm run build:frontend   # Build only frontend
npm run build:backend    # Build only backend
```

### Frontend (`/frontend`)
```bash
npm run dev              # Start Vite dev server (port 3000)
npm run build            # Build for production
npm run preview          # Preview production build
```

### Backend (`/backend`)
```bash
npm run dev              # Start development server with hot reload (port 5001)
npm run build            # Compile TypeScript to JavaScript
npm run start            # Run compiled production build
npm run seed             # Seed stocks table with 100 stocks (Phase 3)
npm run seed:metrics     # Seed technical metrics for all stocks (Phase 3)
```

**Database Scripts (Phase 3):**
```bash
# Seed stock universe
cd backend && npm run seed

# Seed metrics (test mode - 10 stocks)
cd backend && npm run seed:metrics -- --limit 10

# Seed metrics (full - all 100 stocks, takes ~4 days)
cd backend && npm run seed:metrics
```

---

## 🚨 Known Limitations

### Alpha Vantage API
- **Free Tier:** 25 requests per day, 5 requests per minute
- **Data Points:** Compact mode returns ~100 data points (4 months daily)
- **Extended History:** Change `outputsize: 'compact'` to `'full'` in `alphaVantageService.ts`
- **Rate Limits:** Requests are cached for 5 minutes to minimize API usage
- **Metrics Seeding:** Takes ~4 days to seed all 100 stocks (25 stocks/day limit)

### Database (Phase 3)
- **PostgreSQL Required:** Screener features require PostgreSQL running
- **Graceful Degradation:** Chart features work without database
- **Metrics Not Real-Time:** Technical metrics are snapshot-based (daily updates)
- **Incomplete Data:** Some stocks may have <200 days of historical data
- **Stock Universe:** Limited to 100 pre-seeded stocks

### Browser Storage
- **localStorage Quota:** ~5-10MB depending on browser
- **Typical Usage:** Config + presets use <50KB
- **Quota Handling:** Automatic retry after clearing on QuotaExceededError

### Performance
- **All Indicators Enabled:** Smooth rendering on modern hardware
- **Calculation Time:** <100ms for 500+ data points with all indicators
- **Chart Rendering:** Hardware-accelerated via Canvas API
- **Database Queries:** Optimized with indexes, <50ms typical response

### Browser Compatibility
- **Minimum Requirements:** Modern browser with ES2020 support
- **Required Features:** localStorage, Canvas API
- **Tested Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## 🗺️ Development Roadmap

### Phase 4 (Planned - Future Enhancements)

**Real-Time Data & Alerts:**
- [ ] WebSocket connection for live price updates
- [ ] Auto-refresh mode with configurable intervals
- [ ] Price alerts and notifications
- [ ] Streaming intraday updates
- [ ] Real-time metrics calculation

**Drawing Tools & Annotations:**
- [ ] Trendlines, horizontal/vertical lines
- [ ] Fibonacci retracements and extensions
- [ ] Text annotations, shapes, arrows
- [ ] Save/load drawings with localStorage
- [ ] Export charts with annotations (PNG/SVG)

**Advanced Charting:**
- [ ] Multi-symbol comparison on same chart
- [ ] Split-pane layouts (2x2 grid, custom arrangements)
- [ ] Synchronized crosshair across charts
- [ ] Chart themes (dark mode, custom colors)
- [ ] Additional chart types (Heikin Ashi, Renko)

**Enhanced Screener:**
- [ ] Save custom screener queries
- [ ] Watchlist management with categories
- [ ] Portfolio tracking and performance
- [ ] Backtesting capabilities
- [ ] Export results to CSV/Excel
- [ ] Compare stocks side-by-side

**Additional Features:**
- [ ] More technical indicators (ATR, Ichimoku, Volume Profile)
- [ ] User authentication and cloud sync
- [ ] Expand stock universe (1000+ stocks)
- [ ] International markets support
- [ ] Fundamental data integration (P/E, EPS, revenue)
- [ ] News and sentiment analysis
- [ ] Mobile PWA with offline mode

---

## 🐛 Troubleshooting

### Common Issues

**"API key not configured" Error:**
1. Check `backend/.env` file exists and has correct API key
2. Ensure no quotes around the API key value
3. Verify `dotenv.config()` is first line in `backend/src/index.ts`
4. Restart backend server after changing `.env`

**Chart Shows "time=NaN" or Data Doesn't Display:**
1. Check backend console for API errors
2. Verify Alpha Vantage API key is valid and has remaining quota
3. Try a different stock symbol (some symbols may not have data)
4. Check browser console for errors

**CORS Errors:**
1. Ensure backend is running on port 5001
2. Check `frontend/.env` has correct `VITE_API_BASE_URL`
3. Verify `cors` middleware is configured in `backend/src/index.ts`

**Indicators Not Appearing:**
1. Ensure chart data has loaded successfully first
2. Check if enough data points exist (indicators need minimum periods)
3. Verify indicator is enabled (checkbox is checked)
4. Look for JavaScript errors in browser console

**Preset Not Saving:**
1. Check browser localStorage is enabled
2. Clear localStorage quota: `localStorage.clear()` in console
3. Try saving preset with shorter name
4. Check browser console for errors

**Performance Issues:**
1. Disable unused indicators to improve render speed
2. Use shorter timeframes (15min vs daily) for less data
3. Clear browser cache and restart application
4. Update to latest browser version

**PostgreSQL Connection Failed (Phase 3):**
1. Check PostgreSQL is running: `brew services list` or `sudo systemctl status postgresql`
2. Start PostgreSQL: `brew services start postgresql@15` (macOS) or `sudo systemctl start postgresql` (Linux)
3. Verify database exists: `psql -l | grep kuya_charts`
4. Create database if missing: `createdb kuya_charts`
5. Check DATABASE_URL in `backend/.env` is correct
6. Test connection: Run backend and check console for "Database connection successful"

**Screener Shows No Stocks (Phase 3):**
1. Ensure database is seeded: `cd backend && npm run seed`
2. Check backend console for database errors
3. Verify PostgreSQL connection is successful
4. Check network tab for `/api/stocks/list` response
5. Try clearing all filters

**Technical Filters Not Working (Phase 3):**
1. Seed technical metrics: `cd backend && npm run seed:metrics -- --limit 10`
2. Check `/api/stocks/metrics/status` endpoint for metrics status
3. Technical filters only work on stocks with seeded metrics
4. Some stocks may not have metrics if seeding incomplete

---

## 📝 License

ISC

---

## 👨‍💻 Development Notes

### For AI Agents
See [`AI_CONTEXT.md`](./AI_CONTEXT.md) for:
- Detailed implementation patterns
- Critical gotchas and solutions
- Step-by-step guide for adding new indicators
- Multi-pane layout implementation details
- localStorage persistence patterns

### Testing
**Manual Testing:**
1. Start both servers (`npm run dev`)
2. Open http://localhost:3000
3. Enter "AAPL" and select "daily"
4. Enable various indicators and verify display
5. Save/load presets and verify persistence
6. Refresh browser and confirm settings persist

**API Testing:**
```bash
# Health check
curl http://localhost:5001/api/health

# Daily data
curl http://localhost:5001/api/stock/AAPL/daily

# Intraday data
curl http://localhost:5001/api/stock/AAPL/intraday?interval=15min

# Screener API (Phase 3)
curl http://localhost:5001/api/stocks/list
curl http://localhost:5001/api/stocks/sectors
curl "http://localhost:5001/api/stocks/list?sector=Technology&rsiMin=70"
```

---

## 🙏 Acknowledgments

- **TradingView** for the Lightweight Charts library
- **Alpha Vantage** for providing free stock data API
- **technicalindicators** npm package for calculation algorithms

---

**Built with ❤️ using React, TypeScript, PostgreSQL, and TradingView Lightweight Charts**

**Last Updated:** February 6, 2026 - Phase 3 Complete
