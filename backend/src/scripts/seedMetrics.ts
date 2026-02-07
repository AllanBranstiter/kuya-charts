import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { updateAllStockMetrics } from '../services/metricsUpdateService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Seed technical metrics for stocks
 * 
 * Usage:
 *   npm run seed:metrics              - Process all stocks (respects rate limits)
 *   npm run seed:metrics -- --limit 10 - Process only first 10 stocks (for testing)
 */
async function seedMetrics() {
  try {
    console.log('Starting metrics seeding...\n');

    // Parse command line arguments for stock limit
    const args = process.argv.slice(2);
    const limitIndex = args.indexOf('--limit');
    const stockLimit = limitIndex >= 0 && args[limitIndex + 1] 
      ? parseInt(args[limitIndex + 1], 10) 
      : undefined;

    if (stockLimit) {
      console.log(`⚠️  Running in TEST MODE - processing only ${stockLimit} stocks\n`);
      console.log('   This is recommended for initial testing due to API rate limits.');
      console.log('   Alpha Vantage free tier: 25 requests/day\n');
    } else {
      console.log('⚠️  WARNING: Processing ALL stocks');
      console.log('   Alpha Vantage free tier allows only 25 requests/day');
      console.log('   This will take multiple days to complete for 100 stocks');
      console.log('   Consider using --limit flag for testing (e.g., --limit 10)\n');
      
      // Give user time to cancel if needed
      console.log('Starting in 5 seconds... (Press Ctrl+C to cancel)\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Run the metrics update
    const result = await updateAllStockMetrics(stockLimit);

    console.log('\n=== Seeding Summary ===');
    console.log(`Total stocks processed: ${result.total}`);
    console.log(`Successful: ${result.successful}`);
    console.log(`Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\nFailed stocks:');
      result.errors.forEach(({ symbol, error }) => {
        console.log(`  - ${symbol}: ${error}`);
      });
    }

    if (result.successful > 0) {
      console.log('\n✓ Metrics have been seeded successfully!');
      console.log('You can now use the technical filters in the screener.');
    }

    if (result.failed > 0) {
      console.log('\n⚠️  Some stocks failed to process. Check the errors above.');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding metrics:', error);
    process.exit(1);
  }
}

// Run the seeding script
seedMetrics();
