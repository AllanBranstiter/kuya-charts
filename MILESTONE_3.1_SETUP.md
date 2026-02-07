# Phase 3 Milestone 3.1: Stock Universe Backend - Setup Guide

## Overview

Milestone 3.1 adds PostgreSQL-based stock universe infrastructure to support the stock screener feature. This includes database setup, schema definition, seed data, and REST API endpoints for querying stocks.

## Prerequisites

### PostgreSQL Installation

**Option 1: Install via Homebrew (macOS)**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Option 2: Download from PostgreSQL.org**
- Visit: https://www.postgresql.org/download/
- Download and install PostgreSQL for your platform
- Start the PostgreSQL service

**Verify Installation:**
```bash
psql --version
```

## Database Setup

### 1. Create the Database

```bash
# Using createdb command
createdb kuya_charts

# OR using psql
psql -U postgres
CREATE DATABASE kuya_charts;
\q
```

### 2. Configure Environment Variables

Copy the backend `.env.example` to `.env`:
```bash
cd backend
cp .env.example .env
```

Edit `.env` and configure your database connection:
```env
# Option 1: Use connection string (recommended)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kuya_charts

# Option 2: Use individual parameters
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kuya_charts
DB_USER=postgres
DB_PASSWORD=your_password_here
```

**Default Credentials:**
- Username: `postgres`
- Password: `postgres` (or empty for some installations)
- Host: `localhost`
- Port: `5432`

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Seed the Database

Run the seeding script to populate the `stocks` table:
```bash
npm run seed
```

This script will:
- Test the database connection
- Create the `stocks` table and indexes
- Insert 100 stock records (major US stocks)
- Display verification statistics

**Expected Output:**
```
============================================================
Starting Database Seeding Process
============================================================

[1/4] Testing database connection...
✅ Database connection successful

[2/4] Initializing database schema...
✅ Database schema initialized

[3/4] Loading stock data from file...
✅ Loaded 100 stocks from file

[4/4] Inserting stock data into database...
✅ Successfully inserted/updated 100 stocks

============================================================
Verification
============================================================

Total stocks in database: 100

Sample stocks (top 5 by market cap):
  1. AAPL   - Apple Inc.                              ($3000.0B)
  2. MSFT   - Microsoft Corporation                   ($2800.0B)
  3. GOOGL  - Alphabet Inc.                           ($1700.0B)
  ...
```

## Database Schema

### `stocks` Table

| Column       | Type         | Description                          |
|--------------|--------------|--------------------------------------|
| id           | SERIAL       | Primary key                          |
| symbol       | VARCHAR(10)  | Stock ticker symbol (unique)         |
| name         | VARCHAR(255) | Company full name                    |
| sector       | VARCHAR(100) | Industry sector classification       |
| market_cap   | BIGINT       | Market capitalization in USD         |
| exchange     | VARCHAR(20)  | Stock exchange (NYSE, NASDAQ, etc.)  |
| currency     | VARCHAR(3)   | Currency code (default: USD)         |
| last_updated | TIMESTAMP    | Last metadata update timestamp       |

**Indexes:**
- `idx_stocks_symbol` - On `symbol` column
- `idx_stocks_sector` - On `sector` column
- `idx_stocks_market_cap` - On `market_cap` column

## API Endpoints

### GET `/api/stocks/list`

Returns a paginated list of stocks with optional filtering.

**Query Parameters:**
- `sector` (string) - Filter by sector (e.g., "Technology", "Healthcare")
- `minMarketCap` (number) - Minimum market cap in USD
- `maxMarketCap` (number) - Maximum market cap in USD
- `limit` (number) - Results per page (default: 100, max: 500)
- `offset` (number) - Pagination offset (default: 0)

**Example Requests:**
```bash
# Get all stocks (first 100)
curl http://localhost:5000/api/stocks/list

# Get Technology sector stocks
curl http://localhost:5000/api/stocks/list?sector=Technology

# Get stocks with market cap between $100B and $500B
curl http://localhost:5000/api/stocks/list?minMarketCap=100000000000&maxMarketCap=500000000000

# Pagination (get next 50 stocks)
curl http://localhost:5000/api/stocks/list?limit=50&offset=50

# Combined filters
curl "http://localhost:5000/api/stocks/list?sector=Healthcare&minMarketCap=50000000000&limit=20"
```

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
      "last_updated": "2024-01-15T10:30:00.000Z"
    },
    ...
  ],
  "total": 100,
  "limit": 100,
  "offset": 0
}
```

### GET `/api/stocks/sectors`

Returns a list of distinct sectors available in the database.

**Example Request:**
```bash
curl http://localhost:5000/api/stocks/list
```

**Response Format:**
```json
{
  "sectors": [
    "Communication Services",
    "Consumer Cyclical",
    "Consumer Defensive",
    "Energy",
    "Financial Services",
    "Healthcare",
    "Industrials",
    "Real Estate",
    "Technology",
    "Utilities"
  ]
}
```

## Running the Backend

### Development Mode (with auto-reload)
```bash
cd backend
npm run dev
```

The server will start on port 5000 (or PORT specified in .env).

**Expected Console Output:**
```
Environment variables loaded:
PORT: 5000
ALPHA_VANTAGE_API_KEY: ***SET***
NODE_ENV: development
Testing database connection...
Database connection successful: 2024-02-06T07:30:00.000Z
✅ Database connection successful
Initializing database schema...
✅ Database schema initialized
Server is running on port 5000
Environment: development
API Health Check: http://localhost:5000/api/health
```

### Production Mode
```bash
cd backend
npm run build
npm start
```

## Graceful Degradation

If PostgreSQL is not installed or the database cannot be connected, the backend will:
1. Display a warning message
2. Continue to run (existing chart features remain functional)
3. Stock list endpoints will return appropriate errors

**Console Output (without database):**
```
Testing database connection...
Database connection failed: ...
⚠️  Database connection failed - stock list features will not be available
Please ensure PostgreSQL is running and DATABASE_URL is configured in .env
Server is running on port 5000
```

## Troubleshooting

### Connection Errors

**Error:** `ECONNREFUSED` or `Connection refused`
- **Solution:** Ensure PostgreSQL is running
  ```bash
  # macOS (Homebrew)
  brew services start postgresql@15
  
  # Linux
  sudo systemctl start postgresql
  
  # Check status
  brew services list  # macOS
  sudo systemctl status postgresql  # Linux
  ```

**Error:** `password authentication failed`
- **Solution:** Update the password in `.env` file or reset PostgreSQL password

**Error:** `database "kuya_charts" does not exist`
- **Solution:** Create the database:
  ```bash
  createdb kuya_charts
  ```

### Seeding Issues

**Error:** `ENOENT: no such file or directory`
- **Solution:** Ensure you're running `npm run seed` from the `backend` directory

**Error:** Table already exists
- **Solution:** This is normal. The script uses `CREATE TABLE IF NOT EXISTS` and will update existing records

## File Structure

```
backend/
├── src/
│   ├── data/
│   │   └── stocksData.json          # Seed data (100 stocks)
│   ├── routes/
│   │   ├── stockRoutes.ts           # Existing chart data routes
│   │   └── stockListRoutes.ts       # NEW: Stock list routes
│   ├── services/
│   │   ├── alphaVantageService.ts   # Existing API service
│   │   └── databaseService.ts       # NEW: Database operations
│   ├── scripts/
│   │   └── seedStocks.ts            # NEW: Database seeding script
│   ├── types/
│   │   └── stock.ts                 # Updated with DB types
│   ├── utils/
│   │   ├── cache.ts                 # Existing cache utility
│   │   └── db.ts                    # NEW: Database connection pool
│   └── index.ts                     # Updated with DB initialization
├── .env.example                      # Updated with DB config
└── package.json                      # Updated with seed script
```

## Next Steps

After completing Milestone 3.1:
1. **Frontend Integration (Milestone 3.2)**: Create stock list UI component
2. **Screener Logic (Milestone 3.3)**: Add technical indicator filtering
3. **Advanced Filters (Milestone 3.4)**: Price, volume, and custom filters

## Notes

- The seed data includes 100 major US stocks across 10 sectors
- Market cap values are approximate estimates (as of 2024)
- The database schema is designed for future expansion (additional metrics, real-time updates)
- All database operations use connection pooling for performance
- TypeScript types are fully defined for all database models

## Support

If you encounter issues:
1. Check PostgreSQL is installed and running
2. Verify environment variables in `.env`
3. Review console logs for specific error messages
4. Ensure the database `kuya_charts` exists
5. Try re-running the seed script: `npm run seed`
