import { query } from '../utils/db.js';
import { fetchHistoricalData } from './alphaVantageService.js';
import { calculateAllMetrics } from './technicalMetricsService.js';
import { StockMetadata } from '../types/stock.js';

/**
 * Interface for stock metrics to be inserted/updated
 */
interface StockMetrics {
  stock_id: number;
  date: string;
  close_price: number;
  volume: number;
  rsi: number | null;
  price_vs_sma_20: number | null;
  price_vs_sma_50: number | null;
  price_vs_sma_200: number | null;
  volume_spike: number | null;
  avg_volume_20d: number | null;
}

/**
 * Delay helper for rate limiting
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Upsert technical metrics for a stock
 * @param metrics - Metrics data to insert/update
 */
async function upsertMetrics(metrics: StockMetrics): Promise<void> {
  await query(
    `
    INSERT INTO stock_metrics (
      stock_id, date, close_price, volume, rsi,
      price_vs_sma_20, price_vs_sma_50, price_vs_sma_200,
      volume_spike, avg_volume_20d
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (stock_id, date)
    DO UPDATE SET
      close_price = EXCLUDED.close_price,
      volume = EXCLUDED.volume,
      rsi = EXCLUDED.rsi,
      price_vs_sma_20 = EXCLUDED.price_vs_sma_20,
      price_vs_sma_50 = EXCLUDED.price_vs_sma_50,
      price_vs_sma_200 = EXCLUDED.price_vs_sma_200,
      volume_spike = EXCLUDED.volume_spike,
      avg_volume_20d = EXCLUDED.avg_volume_20d
    `,
    [
      metrics.stock_id,
      metrics.date,
      metrics.close_price,
      metrics.volume,
      metrics.rsi,
      metrics.price_vs_sma_20,
      metrics.price_vs_sma_50,
      metrics.price_vs_sma_200,
      metrics.volume_spike,
      metrics.avg_volume_20d,
    ]
  );
}

/**
 * Calculate and store metrics for a single stock
 * @param stock - Stock metadata
 * @returns Success status
 */
export async function updateMetricsForStock(stock: StockMetadata): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`Fetching historical data for ${stock.symbol}...`);
    
    // Fetch historical data (need at least 200 days for 200-day SMA)
    const historicalData = await fetchHistoricalData(stock.symbol);
    
    if (historicalData.length < 200) {
      return {
        success: false,
        error: `Insufficient data: only ${historicalData.length} days available`,
      };
    }

    // Extract prices and volumes
    const closePrices = historicalData.map((d) => d.close);
    const volumes = historicalData.map((d) => d.volume);
    const mostRecentDate = historicalData[0].timestamp.split('T')[0]; // Get date part

    // Calculate all technical metrics
    const metrics = calculateAllMetrics(closePrices, volumes);

    // Store in database
    await upsertMetrics({
      stock_id: stock.id!,
      date: mostRecentDate,
      close_price: closePrices[0],
      volume: volumes[0],
      rsi: metrics.rsi,
      price_vs_sma_20: metrics.priceVsSma20,
      price_vs_sma_50: metrics.priceVsSma50,
      price_vs_sma_200: metrics.priceVsSma200,
      volume_spike: metrics.volumeSpike,
      avg_volume_20d: metrics.avgVolume20d,
    });

    console.log(`✓ Successfully updated metrics for ${stock.symbol}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`✗ Failed to update metrics for ${stock.symbol}:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update metrics for all stocks (with rate limiting)
 * @param stockLimit - Optional limit on number of stocks to process (for testing)
 * @param delayBetweenRequests - Delay in ms between API requests (default: 13000ms = ~4.5 req/min for free tier)
 * @returns Summary of results
 */
export async function updateAllStockMetrics(
  stockLimit?: number,
  delayBetweenRequests: number = 13000
): Promise<{
  total: number;
  successful: number;
  failed: number;
  errors: { symbol: string; error: string }[];
}> {
  console.log('\n=== Starting metrics update for all stocks ===\n');

  try {
    // Fetch all stocks from database
    const result = await query<StockMetadata>('SELECT * FROM stocks ORDER BY symbol');
    let stocks = result.rows;

    // Apply stock limit if specified (useful for testing)
    if (stockLimit && stockLimit > 0) {
      stocks = stocks.slice(0, stockLimit);
      console.log(`Limited to first ${stockLimit} stocks for processing\n`);
    }

    const total = stocks.length;
    let successful = 0;
    let failed = 0;
    const errors: { symbol: string; error: string }[] = [];

    console.log(`Processing ${total} stocks...`);
    console.log(`Delay between requests: ${delayBetweenRequests}ms\n`);

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      console.log(`[${i + 1}/${total}] Processing ${stock.symbol}...`);

      const result = await updateMetricsForStock(stock);

      if (result.success) {
        successful++;
      } else {
        failed++;
        errors.push({ symbol: stock.symbol, error: result.error || 'Unknown error' });
      }

      // Add delay between requests to respect API rate limits
      // (except after the last stock)
      if (i < stocks.length - 1) {
        console.log(`Waiting ${delayBetweenRequests}ms before next request...\n`);
        await delay(delayBetweenRequests);
      }
    }

    console.log('\n=== Metrics update complete ===');
    console.log(`Total: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(({ symbol, error }) => {
        console.log(`  - ${symbol}: ${error}`);
      });
    }

    return { total, successful, failed, errors };
  } catch (error) {
    console.error('Failed to update stock metrics:', error);
    throw error;
  }
}

/**
 * Get metrics status (last update date and count)
 * @returns Status information
 */
export async function getMetricsStatus(): Promise<{
  last_updated: string | null;
  stocks_with_metrics: number;
  total_stocks: number;
}> {
  try {
    // Get last update date
    const dateResult = await query<{ max_date: string | null }>(
      'SELECT MAX(date) as max_date FROM stock_metrics'
    );
    const lastUpdated = dateResult.rows[0]?.max_date || null;

    // Get count of stocks with metrics
    const metricsCountResult = await query<{ count: string }>(
      'SELECT COUNT(DISTINCT stock_id) as count FROM stock_metrics'
    );
    const stocksWithMetrics = parseInt(metricsCountResult.rows[0].count, 10);

    // Get total stocks count
    const totalStocksResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM stocks'
    );
    const totalStocks = parseInt(totalStocksResult.rows[0].count, 10);

    return {
      last_updated: lastUpdated,
      stocks_with_metrics: stocksWithMetrics,
      total_stocks: totalStocks,
    };
  } catch (error) {
    console.error('Failed to get metrics status:', error);
    throw error;
  }
}
