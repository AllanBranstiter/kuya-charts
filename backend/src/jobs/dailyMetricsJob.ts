import cron from 'node-cron';
import { updateAllStockMetrics } from '../services/metricsUpdateService.js';

/**
 * Daily job to update technical metrics for all stocks
 * Scheduled to run at 7:00 PM ET (after market close at 4:00 PM ET + 3 hours)
 * 
 * Cron schedule: "0 19 * * 1-5" = Every weekday at 7:00 PM
 * Note: Adjust timezone in your system if needed
 */
export function scheduleDailyMetricsUpdate(): void {
  // Schedule job for weekdays at 7:00 PM
  // Export the job reference to prevent it from being garbage collected
  const job = cron.schedule('0 19 * * 1-5', async () => {
    console.log('\n=== Daily Metrics Update Job Started ===');
    console.log(`Time: ${new Date().toISOString()}`);

    try {
      // Update metrics for all stocks
      // Note: With 100 stocks and 25 API calls/day limit, this will only update 25 stocks per day
      const result = await updateAllStockMetrics(25); // Limit to 25 stocks to respect API rate limits

      console.log('\n=== Daily Metrics Update Job Completed ===');
      console.log(`Successful: ${result.successful}`);
      console.log(`Failed: ${result.failed}`);
    } catch (error) {
      console.error('Daily metrics update job failed:', error);
    }
  });

  // Keep reference to prevent garbage collection
  void job;

  console.log('Daily metrics update job scheduled (7:00 PM ET on weekdays)');
  console.log('Note: Job will update 25 stocks per day due to API rate limits');
}

/**
 * Stop the scheduled job (for cleanup)
 */
export function stopDailyMetricsUpdate(): void {
  cron.getTasks().forEach((task) => task.stop());
  console.log('Daily metrics update job stopped');
}

/**
 * Manually trigger the metrics update (for testing)
 * @param stockLimit - Optional limit on number of stocks to process
 */
export async function triggerMetricsUpdate(stockLimit?: number): Promise<void> {
  console.log('\n=== Manual Metrics Update Triggered ===');
  
  try {
    const result = await updateAllStockMetrics(stockLimit);
    
    console.log('\n=== Manual Metrics Update Completed ===');
    console.log(`Total: ${result.total}`);
    console.log(`Successful: ${result.successful}`);
    console.log(`Failed: ${result.failed}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(({ symbol, error }) => {
        console.log(`  - ${symbol}: ${error}`);
      });
    }
  } catch (error) {
    console.error('Manual metrics update failed:', error);
    throw error;
  }
}
