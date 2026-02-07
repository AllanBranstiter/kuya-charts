import { websocketService, PriceUpdateData } from './websocketService.js';
import { fetchDailyData } from './alphaVantageService.js';

/**
 * Real-time Price Service
 * 
 * DEVELOPMENT MODE: Uses simulated price updates based on latest stock data
 * 
 * PRODUCTION UPGRADE PATH:
 * - Option 1: Integrate with Polygon.io WebSocket API (https://polygon.io/)
 * - Option 2: Integrate with Finnhub WebSocket API (https://finnhub.io/)
 * - Option 3: Integrate with IEX Cloud WebSocket API (https://iexcloud.io/)
 * - Option 4: Use Alpha Vantage WebSocket (requires paid subscription)
 * 
 * For production, replace the simulatePrice* methods with actual WebSocket
 * connections to real-time data providers.
 */

/**
 * Symbol state for price simulation
 */
interface SymbolState {
  symbol: string;
  basePrice: number;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  lastUpdate: Date;
  volatility: number; // Daily volatility (0.01 = 1%)
}

class RealtimePriceService {
  private symbolStates: Map<string, SymbolState> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  // Configuration
  private readonly UPDATE_INTERVAL_MS = 4000; // 4 seconds
  private readonly MIN_PRICE_CHANGE_PERCENT = 0.001; // 0.1%
  private readonly MAX_PRICE_CHANGE_PERCENT = 0.02; // 2%
  private readonly DEFAULT_VOLATILITY = 0.015; // 1.5% default daily volatility

  /**
   * Start the real-time price service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Real-time price service already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ Real-time price service started (SIMULATION MODE)');
    console.log(`Update interval: ${this.UPDATE_INTERVAL_MS}ms`);

    // Start monitoring subscribed symbols
    this.startMonitoring();
  }

  /**
   * Stop the real-time price service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping real-time price service...');
    
    // Clear all update intervals
    this.updateIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    
    this.updateIntervals.clear();
    this.symbolStates.clear();
    this.isRunning = false;

    console.log('✅ Real-time price service stopped');
  }

  /**
   * Monitor subscribed symbols and start/stop price updates accordingly
   */
  private startMonitoring(): void {
    // Check every 5 seconds for new subscriptions
    setInterval(() => {
      if (!this.isRunning) {
        return;
      }

      const subscribedSymbols = websocketService.getSubscribedSymbols();

      // Start updates for new subscriptions
      subscribedSymbols.forEach((symbol) => {
        if (!this.updateIntervals.has(symbol)) {
          this.startSymbolUpdates(symbol);
        }
      });

      // Stop updates for unsubscribed symbols
      this.updateIntervals.forEach((interval, symbol) => {
        if (!subscribedSymbols.includes(symbol)) {
          this.stopSymbolUpdates(symbol);
        }
      });
    }, 5000);
  }

  /**
   * Start price updates for a specific symbol
   */
  private async startSymbolUpdates(symbol: string): Promise<void> {
    console.log(`Starting price updates for ${symbol}`);

    try {
      // Initialize symbol state if not exists
      if (!this.symbolStates.has(symbol)) {
        await this.initializeSymbolState(symbol);
      }

      // Start periodic updates
      const interval = setInterval(() => {
        this.updateSymbolPrice(symbol);
      }, this.UPDATE_INTERVAL_MS);

      this.updateIntervals.set(symbol, interval);

      // Send initial update immediately
      this.updateSymbolPrice(symbol);
    } catch (error) {
      console.error(`Error starting updates for ${symbol}:`, error);
    }
  }

  /**
   * Stop price updates for a specific symbol
   */
  private stopSymbolUpdates(symbol: string): void {
    console.log(`Stopping price updates for ${symbol}`);

    const interval = this.updateIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(symbol);
    }

    // Keep symbol state for potential re-subscription
    // Clean up after 5 minutes of inactivity
    setTimeout(() => {
      if (!this.updateIntervals.has(symbol)) {
        this.symbolStates.delete(symbol);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Initialize symbol state from latest market data
   * 
   * PRODUCTION: Replace with actual market data initialization
   */
  private async initializeSymbolState(symbol: string): Promise<void> {
    try {
      // Fetch latest daily data to get base price
      const dailyData = await fetchDailyData(symbol);
      
      if (!dailyData || dailyData.length === 0) {
        throw new Error(`No data available for ${symbol}`);
      }

      const latestData = dailyData[0];
      const basePrice = latestData.close;

      // Calculate volatility from recent price movements (simplified)
      let volatility = this.DEFAULT_VOLATILITY;
      if (dailyData.length >= 20) {
        const returns = [];
        for (let i = 0; i < Math.min(20, dailyData.length - 1); i++) {
          const return_ = (dailyData[i].close - dailyData[i + 1].close) / dailyData[i + 1].close;
          returns.push(return_);
        }
        // Standard deviation of returns
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        volatility = Math.sqrt(variance);
      }

      const state: SymbolState = {
        symbol,
        basePrice,
        currentPrice: basePrice,
        open: basePrice,
        high: basePrice,
        low: basePrice,
        volume: 0,
        lastUpdate: new Date(),
        volatility: Math.max(volatility, 0.005), // Minimum 0.5% volatility
      };

      this.symbolStates.set(symbol, state);
      console.log(`Initialized ${symbol} at $${basePrice.toFixed(2)} (volatility: ${(volatility * 100).toFixed(2)}%)`);
    } catch (error) {
      console.error(`Failed to initialize ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Update symbol price with simulated movement
   * 
   * PRODUCTION: Replace with actual price updates from WebSocket feed
   */
  private updateSymbolPrice(symbol: string): void {
    const state = this.symbolStates.get(symbol);
    if (!state) {
      console.error(`No state found for ${symbol}`);
      return;
    }

    // Generate realistic price movement
    const newPrice = this.simulatePriceMovement(state);
    const previousPrice = state.currentPrice;

    // Update state
    state.currentPrice = newPrice;
    state.high = Math.max(state.high, newPrice);
    state.low = Math.min(state.low, newPrice);
    state.volume += this.simulateVolumeChange();
    state.lastUpdate = new Date();

    // Calculate price change
    const change = newPrice - state.open;
    const changePercent = (change / state.open) * 100;

    // Create price update
    const priceUpdate: PriceUpdateData = {
      price: parseFloat(newPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(state.volume),
      timestamp: state.lastUpdate.toISOString(),
      open: parseFloat(state.open.toFixed(2)),
      high: parseFloat(state.high.toFixed(2)),
      low: parseFloat(state.low.toFixed(2)),
    };

    // Broadcast to subscribed clients
    websocketService.broadcast(symbol, priceUpdate);
  }

  /**
   * Simulate realistic price movement using random walk with volatility
   * 
   * Uses a simple geometric Brownian motion model:
   * dS = μ * S * dt + σ * S * dW
   * where:
   * - S = current price
   * - μ = drift (trend) - set to 0 for random walk
   * - σ = volatility
   * - dW = random shock (normally distributed)
   * - dt = time step
   */
  private simulatePriceMovement(state: SymbolState): number {
    const { currentPrice, volatility } = state;

    // Time step (fraction of trading day, assuming 6.5 hours = 390 minutes)
    const dt = (this.UPDATE_INTERVAL_MS / 1000) / (390 * 60); // Convert to trading day fraction

    // Random shock (Box-Muller transform for normal distribution)
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Price change
    const drift = 0; // No trend, pure random walk
    const shock = volatility * z * Math.sqrt(dt);
    const priceChange = currentPrice * (drift * dt + shock);

    // Bound the change to realistic limits
    const maxChange = currentPrice * this.MAX_PRICE_CHANGE_PERCENT;
    const minChange = -currentPrice * this.MAX_PRICE_CHANGE_PERCENT;
    const boundedChange = Math.max(minChange, Math.min(maxChange, priceChange));

    return currentPrice + boundedChange;
  }

  /**
   * Simulate volume change
   */
  private simulateVolumeChange(): number {
    // Random volume between 1,000 and 10,000 shares per update
    return Math.floor(Math.random() * 9000) + 1000;
  }

  /**
   * Reset daily stats (call at market open)
   * In production, this would be triggered by actual market open events
   */
  resetDailyStats(): void {
    this.symbolStates.forEach((state) => {
      state.open = state.currentPrice;
      state.high = state.currentPrice;
      state.low = state.currentPrice;
      state.volume = 0;
    });
    console.log('Reset daily stats for all symbols');
  }

  /**
   * Get current state for a symbol (for debugging/monitoring)
   */
  getSymbolState(symbol: string): SymbolState | undefined {
    return this.symbolStates.get(symbol);
  }

  /**
   * Get all active symbols
   */
  getActiveSymbols(): string[] {
    return Array.from(this.symbolStates.keys());
  }
}

/**
 * PRODUCTION INTEGRATION GUIDE
 * 
 * To integrate with a real WebSocket data provider:
 * 
 * 1. Polygon.io Example:
 *    import WebSocket from 'ws';
 *    const ws = new WebSocket('wss://socket.polygon.io/stocks');
 *    ws.on('message', (data) => {
 *      const trade = JSON.parse(data);
 *      // Transform and broadcast via websocketService
 *    });
 * 
 * 2. Finnhub Example:
 *    const finnhubWs = new WebSocket('wss://ws.finnhub.io?token=YOUR_TOKEN');
 *    finnhubWs.on('message', (data) => {
 *      const update = JSON.parse(data);
 *      // Transform and broadcast via websocketService
 *    });
 * 
 * 3. IEX Cloud Example:
 *    const iexWs = new WebSocket('wss://cloud-sse.iexapis.com/stable/stocksUS?token=YOUR_TOKEN');
 *    iexWs.on('message', (data) => {
 *      const quote = JSON.parse(data);
 *      // Transform and broadcast via websocketService
 *    });
 * 
 * Key considerations:
 * - Handle authentication with API keys
 * - Subscribe/unsubscribe to symbols dynamically
 * - Transform provider data format to PriceUpdateData interface
 * - Implement reconnection logic for provider WebSocket
 * - Add error handling and rate limiting
 * - Monitor connection health
 */

// Export singleton instance
export const realtimePriceService = new RealtimePriceService();
