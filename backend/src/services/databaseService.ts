import { query, getClient, testConnection } from '../utils/db.js';
import { StockMetadata, StockListFilters, StockListResponse } from '../types/stock.js';
import { cacheService, CacheTTL, CacheKeys } from './cacheService.js';
import { createHash } from 'crypto';

/**
 * Initialize database tables
 * Creates the stocks table if it doesn't exist with proper indexes
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing database schema...');

    // Create stocks table
    await query(`
      CREATE TABLE IF NOT EXISTS stocks (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        sector VARCHAR(100),
        market_cap BIGINT,
        exchange VARCHAR(20),
        currency VARCHAR(3) DEFAULT 'USD',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for query performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap)
    `);

    // Create stock_metrics table for technical indicators
    await query(`
      CREATE TABLE IF NOT EXISTS stock_metrics (
        id SERIAL PRIMARY KEY,
        stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        close_price DECIMAL(10,2),
        volume BIGINT,
        rsi DECIMAL(5,2),
        price_vs_sma_20 DECIMAL(6,2),
        price_vs_sma_50 DECIMAL(6,2),
        price_vs_sma_200 DECIMAL(6,2),
        volume_spike DECIMAL(6,2),
        avg_volume_20d BIGINT,
        UNIQUE(stock_id, date)
      )
    `);

    // Create indexes for stock_metrics table
    await query(`
      CREATE INDEX IF NOT EXISTS idx_metrics_stock_id ON stock_metrics(stock_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_metrics_date ON stock_metrics(date)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_metrics_rsi ON stock_metrics(rsi)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_metrics_price_vs_sma_50 ON stock_metrics(price_vs_sma_50)
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Create a hash of filters for cache key generation
 * @param filters - Stock list filters
 * @returns Hash string
 */
function createFilterHash(filters: StockListFilters): string {
  const filterString = JSON.stringify(filters, Object.keys(filters).sort());
  return createHash('md5').update(filterString).digest('hex');
}

/**
 * Get list of stocks with optional filtering and pagination
 * Joins with stock_metrics table to include technical indicators
 * Implements cache-aside pattern with 1-hour TTL for screener results
 * @param filters - Optional filters for sector, market cap, technical indicators, etc.
 * @returns StockListResponse with stocks array and total count
 */
export async function getStocksList(filters: StockListFilters = {}): Promise<StockListResponse> {
  try {
    // Create cache key based on filters
    const filterHash = createFilterHash(filters);
    const cacheKey = CacheKeys.screener(filterHash);
    
    // Try to get from cache first
    const cachedData = await cacheService.getJSON<StockListResponse>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Cache miss - query database
    const {
      sector,
      minMarketCap,
      maxMarketCap,
      minPrice,
      maxPrice,
      rsiMin,
      rsiMax,
      priceVsSma50,
      priceVsSma200,
      volumeSpikeMin,
      limit = 25,
      offset = 0,
      page,
    } = filters;

    // Calculate offset from page number if provided
    const actualOffset = page !== undefined ? (page - 1) * limit : offset;

    // Build WHERE clause dynamically based on filters
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Fundamental filters
    if (sector) {
      conditions.push(`s.sector = $${paramIndex}`);
      params.push(sector);
      paramIndex++;
    }

    if (minMarketCap !== undefined) {
      conditions.push(`s.market_cap >= $${paramIndex}`);
      params.push(minMarketCap);
      paramIndex++;
    }

    if (maxMarketCap !== undefined) {
      conditions.push(`s.market_cap <= $${paramIndex}`);
      params.push(maxMarketCap);
      paramIndex++;
    }

    // Technical filters (only apply if stock has metrics)
    if (minPrice !== undefined) {
      conditions.push(`m.close_price >= $${paramIndex}`);
      params.push(minPrice);
      paramIndex++;
    }

    if (maxPrice !== undefined) {
      conditions.push(`m.close_price <= $${paramIndex}`);
      params.push(maxPrice);
      paramIndex++;
    }

    if (rsiMin !== undefined) {
      conditions.push(`m.rsi >= $${paramIndex}`);
      params.push(rsiMin);
      paramIndex++;
    }

    if (rsiMax !== undefined) {
      conditions.push(`m.rsi <= $${paramIndex}`);
      params.push(rsiMax);
      paramIndex++;
    }

    if (priceVsSma50 === 'above') {
      conditions.push(`m.price_vs_sma_50 > 0`);
    } else if (priceVsSma50 === 'below') {
      conditions.push(`m.price_vs_sma_50 < 0`);
    }

    if (priceVsSma200 === 'above') {
      conditions.push(`m.price_vs_sma_200 > 0`);
    } else if (priceVsSma200 === 'below') {
      conditions.push(`m.price_vs_sma_200 < 0`);
    }

    if (volumeSpikeMin !== undefined) {
      conditions.push(`m.volume_spike >= $${paramIndex}`);
      params.push(volumeSpikeMin);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count with metrics join
    const countQuery = `
      SELECT COUNT(*) as total
      FROM stocks s
      LEFT JOIN LATERAL (
        SELECT * FROM stock_metrics
        WHERE stock_id = s.id
        ORDER BY date DESC
        LIMIT 1
      ) m ON true
      ${whereClause}
    `;
    const countResult = await query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results with latest metrics
    const dataQuery = `
      SELECT
        s.id, s.symbol, s.name, s.sector, s.market_cap, s.exchange, s.currency, s.last_updated,
        m.close_price, m.volume, m.rsi,
        m.price_vs_sma_20, m.price_vs_sma_50, m.price_vs_sma_200,
        m.volume_spike, m.avg_volume_20d, m.date as metrics_date
      FROM stocks s
      LEFT JOIN LATERAL (
        SELECT * FROM stock_metrics
        WHERE stock_id = s.id
        ORDER BY date DESC
        LIMIT 1
      ) m ON true
      ${whereClause}
      ORDER BY s.market_cap DESC NULLS LAST, s.symbol ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await query<StockMetadata>(dataQuery, [...params, limit, actualOffset]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const currentPage = page !== undefined ? page : Math.floor(actualOffset / limit) + 1;
    
    const response: StockListResponse = {
      stocks: dataResult.rows,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
      // Legacy fields for backward compatibility
      total,
      limit,
      offset: actualOffset,
    };
    
    // Store in cache with 1-hour TTL
    await cacheService.setJSON(cacheKey, response, CacheTTL.SCREENER);
    
    return response;
  } catch (error) {
    console.error('Failed to get stocks list:', error);
    throw error;
  }
}

/**
 * Get a single stock by symbol
 * Implements caching with 24-hour TTL
 * @param symbol - Stock ticker symbol
 * @returns StockMetadata or null if not found
 */
export async function getStockBySymbol(symbol: string): Promise<StockMetadata | null> {
  try {
    const cacheKey = CacheKeys.metrics(symbol);
    
    // Try to get from cache first
    const cachedData = await cacheService.getJSON<StockMetadata>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Cache miss - query database
    const result = await query<StockMetadata>(
      'SELECT id, symbol, name, sector, market_cap, exchange, currency, last_updated FROM stocks WHERE symbol = $1',
      [symbol.toUpperCase()]
    );

    const stock = result.rows.length > 0 ? result.rows[0] : null;
    
    // Store in cache with 24-hour TTL if found
    if (stock) {
      await cacheService.setJSON(cacheKey, stock, CacheTTL.METRICS);
    }

    return stock;
  } catch (error) {
    console.error(`Failed to get stock ${symbol}:`, error);
    throw error;
  }
}

/**
 * Insert a new stock or update if already exists
 * @param stock - Stock metadata to insert/update
 * @returns Inserted/updated stock data
 */
export async function upsertStock(stock: StockMetadata): Promise<StockMetadata> {
  try {
    const result = await query<StockMetadata>(
      `
      INSERT INTO stocks (symbol, name, sector, market_cap, exchange, currency, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (symbol)
      DO UPDATE SET
        name = EXCLUDED.name,
        sector = EXCLUDED.sector,
        market_cap = EXCLUDED.market_cap,
        exchange = EXCLUDED.exchange,
        currency = EXCLUDED.currency,
        last_updated = CURRENT_TIMESTAMP
      RETURNING id, symbol, name, sector, market_cap, exchange, currency, last_updated
      `,
      [
        stock.symbol.toUpperCase(),
        stock.name,
        stock.sector || null,
        stock.market_cap || null,
        stock.exchange || null,
        stock.currency || 'USD',
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Failed to upsert stock:', error);
    throw error;
  }
}

/**
 * Bulk insert stocks (more efficient for seeding)
 * @param stocks - Array of stock metadata
 * @returns Number of stocks inserted
 */
export async function bulkInsertStocks(stocks: StockMetadata[]): Promise<number> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    let insertedCount = 0;

    for (const stock of stocks) {
      await client.query(
        `
        INSERT INTO stocks (symbol, name, sector, market_cap, exchange, currency, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (symbol)
        DO UPDATE SET
          name = EXCLUDED.name,
          sector = EXCLUDED.sector,
          market_cap = EXCLUDED.market_cap,
          exchange = EXCLUDED.exchange,
          currency = EXCLUDED.currency,
          last_updated = CURRENT_TIMESTAMP
        `,
        [
          stock.symbol.toUpperCase(),
          stock.name,
          stock.sector || null,
          stock.market_cap || null,
          stock.exchange || null,
          stock.currency || 'USD',
        ]
      );
      insertedCount++;
    }

    await client.query('COMMIT');
    console.log(`Successfully bulk inserted/updated ${insertedCount} stocks`);
    return insertedCount;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to bulk insert stocks:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete all stocks from the database
 * Use with caution!
 */
export async function deleteAllStocks(): Promise<void> {
  try {
    await query('DELETE FROM stocks');
    console.log('All stocks deleted from database');
  } catch (error) {
    console.error('Failed to delete stocks:', error);
    throw error;
  }
}

/**
 * Get distinct sectors from stocks table
 * @returns Array of sector names
 */
export async function getDistinctSectors(): Promise<string[]> {
  try {
    const result = await query<{ sector: string }>(
      'SELECT DISTINCT sector FROM stocks WHERE sector IS NOT NULL ORDER BY sector'
    );
    return result.rows.map(row => row.sector);
  } catch (error) {
    console.error('Failed to get sectors:', error);
    throw error;
  }
}

/**
 * Test database connection and return status
 * @returns boolean indicating connection status
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  return await testConnection();
}
