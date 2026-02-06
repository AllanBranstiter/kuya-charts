# Kuya Charts - AI Context

**Quick Start Document for AI Agents**

## What Is This Project?

A professional stock charting web application built with React + Express that displays real-time stock data with technical indicators using the Alpha Vantage API.

**Status:** Phase 1 MVP Complete (February 2026)

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, TradingView Lightweight Charts, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Data | Alpha Vantage API, in-memory cache (5-min TTL) |
| Indicators | technicalindicators npm package |

---

## Project Structure

```
kuya-charts/
├── frontend/src/
│   ├── components/          # App.tsx, Chart.tsx, SymbolInput, TimeframeSelector, IndicatorControls
│   ├── services/stockApi.ts # Backend API client
│   ├── types/stock.ts       # TypeScript types
│   └── utils/indicators.ts  # SMA/EMA/Volume calculations
│
├── backend/src/
│   ├── routes/stockRoutes.ts           # API endpoints
│   ├── services/alphaVantageService.ts # Alpha Vantage integration
│   ├── middleware/rateLimiter.ts       # 5 req/min rate limiting
│   ├── utils/cache.ts                  # In-memory cache
│   ├── types/stock.ts                  # TypeScript types
│   └── index.ts                        # Express server (PORT 5001)
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

---

## Environment Setup

### Backend (.env)
```bash
PORT=5001
ALPHA_VANTAGE_API_KEY=MRQTPUYFM1G9BDAV  # NO QUOTES - critical!
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

---

## Key Features (Implemented)

1. **Stock Data Fetching** - Daily and intraday data for any symbol
2. **Interactive Charts** - TradingView Lightweight Charts with candlesticks
3. **Timeframes** - 15min, 30min, 1hour, daily, weekly
4. **Indicators** - SMA (blue), EMA (orange), Volume (histogram)
5. **Caching** - 5-minute in-memory cache
6. **Rate Limiting** - Protects Alpha Vantage free tier (25 req/day)

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
| API endpoint changes | `backend/src/routes/stockRoutes.ts` |
| Data fetching logic | `backend/src/services/alphaVantageService.ts` |
| Chart rendering | `frontend/src/components/Chart.tsx` |
| Indicator calculations | `frontend/src/utils/indicators.ts` |
| Type definitions | Both `*/src/types/stock.ts` |
| Server config | `backend/src/index.ts` |
| Frontend API calls | `frontend/src/services/stockApi.ts` |

---

## Alpha Vantage API Notes

- **Free Tier:** 25 requests/day
- **Current Setting:** `outputsize: 'compact'` (100 data points = ~4 months)
- **Full History:** Change to `outputsize: 'full'` (up to 20 years)
- **Functions Used:** TIME_SERIES_DAILY, TIME_SERIES_INTRADAY

---

## Next Development Steps (Not Implemented)

- Phase 2: More indicators (RSI, MACD, Bollinger Bands)
- Phase 3: Drawing tools, chart layouts, real-time updates
- Future: Authentication, watchlists, database persistence

---

**Project Path:** `/Users/allanbranstiter/Documents/GitHub/kuya-charts`  
**Last Updated:** February 6, 2026
