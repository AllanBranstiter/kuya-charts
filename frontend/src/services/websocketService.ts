/**
 * WebSocket Service - Singleton connection manager for real-time price updates
 * 
 * Features:
 * - Singleton pattern (one connection for entire app)
 * - Auto-reconnect with exponential backoff
 * - Subscription management
 * - Event emitter pattern for price updates
 * - Connection state management
 */

import {
  ConnectionStatus,
  RealtimePriceUpdate,
  PriceUpdateCallback,
  ConnectionStatusCallback,
  ErrorCallback,
  SubscribeMessage,
  UnsubscribeMessage,
  PriceUpdateMessage,
  ErrorMessage,
  ConnectedMessage,
} from '../types/realtime';

// Get WebSocket URL from environment or fallback to default
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5001/ws';

// Reconnection settings
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 10; // Stop trying after 10 attempts

class WebSocketService {
  private static instance: WebSocketService | null = null;
  private ws: WebSocket | null = null;
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts = 0;
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;

  // Event listeners
  private priceUpdateListeners: Map<string, Set<PriceUpdateCallback>> = new Map();
  private connectionStatusListeners: Set<ConnectionStatusCallback> = new Set();
  private errorListeners: Set<ErrorCallback> = new Set();

  // Pending subscriptions (for when connection is being established)
  private pendingSubscriptions: Set<string> = new Set();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('[WebSocket] Already connected or connecting');
      return;
    }

    this.setConnectionStatus(ConnectionStatus.CONNECTING);
    console.log(`[WebSocket] Connecting to ${WS_URL}...`);

    try {
      this.ws = new WebSocket(WS_URL);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.handleError('Failed to connect to WebSocket server');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    console.log('[WebSocket] Disconnecting...');
    this.shouldReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
    this.subscribedSymbols.clear();
    this.pendingSubscriptions.clear();
  }

  /**
   * Subscribe to price updates for symbols
   */
  public subscribe(symbols: string[]): void {
    if (symbols.length === 0) return;

    console.log('[WebSocket] Subscribing to symbols:', symbols);

    // Add to subscribed symbols
    symbols.forEach(symbol => {
      this.subscribedSymbols.add(symbol.toUpperCase());
    });

    // If connected, send subscribe message immediately
    if (this.connectionStatus === ConnectionStatus.CONNECTED && this.ws) {
      this.sendSubscribeMessage(symbols);
    } else {
      // Otherwise, add to pending and connect if needed
      symbols.forEach(symbol => {
        this.pendingSubscriptions.add(symbol.toUpperCase());
      });
      
      if (this.connectionStatus === ConnectionStatus.DISCONNECTED) {
        this.connect();
      }
    }
  }

  /**
   * Unsubscribe from price updates for symbols
   */
  public unsubscribe(symbols: string[]): void {
    if (symbols.length === 0) return;

    console.log('[WebSocket] Unsubscribing from symbols:', symbols);

    // Remove from subscribed symbols
    symbols.forEach(symbol => {
      this.subscribedSymbols.delete(symbol.toUpperCase());
      this.pendingSubscriptions.delete(symbol.toUpperCase());
    });

    // Send unsubscribe message if connected
    if (this.connectionStatus === ConnectionStatus.CONNECTED && this.ws) {
      this.sendUnsubscribeMessage(symbols);
    }

    // If no more subscriptions, disconnect
    if (this.subscribedSymbols.size === 0) {
      console.log('[WebSocket] No more subscriptions, disconnecting');
      this.disconnect();
    }
  }

  /**
   * Add listener for price updates for a specific symbol
   */
  public addPriceUpdateListener(symbol: string, callback: PriceUpdateCallback): void {
    const upperSymbol = symbol.toUpperCase();
    if (!this.priceUpdateListeners.has(upperSymbol)) {
      this.priceUpdateListeners.set(upperSymbol, new Set());
    }
    this.priceUpdateListeners.get(upperSymbol)!.add(callback);
  }

  /**
   * Remove price update listener
   */
  public removePriceUpdateListener(symbol: string, callback: PriceUpdateCallback): void {
    const upperSymbol = symbol.toUpperCase();
    const listeners = this.priceUpdateListeners.get(upperSymbol);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.priceUpdateListeners.delete(upperSymbol);
      }
    }
  }

  /**
   * Add connection status listener
   */
  public addConnectionStatusListener(callback: ConnectionStatusCallback): void {
    this.connectionStatusListeners.add(callback);
    // Immediately call with current status
    callback(this.connectionStatus);
  }

  /**
   * Remove connection status listener
   */
  public removeConnectionStatusListener(callback: ConnectionStatusCallback): void {
    this.connectionStatusListeners.delete(callback);
  }

  /**
   * Add error listener
   */
  public addErrorListener(callback: ErrorCallback): void {
    this.errorListeners.add(callback);
  }

  /**
   * Remove error listener
   */
  public removeErrorListener(callback: ErrorCallback): void {
    this.errorListeners.delete(callback);
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get list of subscribed symbols
   */
  public getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected successfully');
      this.setConnectionStatus(ConnectionStatus.CONNECTED);
      this.reconnectAttempts = 0;
      this.reconnectDelay = INITIAL_RECONNECT_DELAY;

      // Subscribe to any pending subscriptions
      if (this.pendingSubscriptions.size > 0) {
        const symbols = Array.from(this.pendingSubscriptions);
        this.sendSubscribeMessage(symbols);
        this.pendingSubscriptions.clear();
      }

      // Re-subscribe to all tracked symbols (in case of reconnect)
      if (this.subscribedSymbols.size > 0) {
        const symbols = Array.from(this.subscribedSymbols);
        this.sendSubscribeMessage(symbols);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      this.handleError('WebSocket connection error');
    };

    this.ws.onclose = (event) => {
      console.log('[WebSocket] Connection closed', event.code, event.reason);
      this.ws = null;

      if (this.shouldReconnect && this.subscribedSymbols.size > 0) {
        this.scheduleReconnect();
      } else {
        this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: PriceUpdateMessage | ErrorMessage | ConnectedMessage): void {
    switch (message.type) {
      case 'connected':
        console.log('[WebSocket]', message.message);
        break;

      case 'price_update':
        this.handlePriceUpdate(message.data);
        break;

      case 'error':
        console.error('[WebSocket] Server error:', message.message);
        this.handleError(message.message);
        break;

      default:
        console.warn('[WebSocket] Unknown message type:', message);
    }
  }

  /**
   * Handle price update message
   */
  private handlePriceUpdate(update: RealtimePriceUpdate): void {
    const symbol = update.symbol.toUpperCase();
    const listeners = this.priceUpdateListeners.get(symbol);
    
    if (listeners && listeners.size > 0) {
      listeners.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('[WebSocket] Error in price update callback:', error);
        }
      });
    }
  }

  /**
   * Send subscribe message to server
   */
  private sendSubscribeMessage(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send subscribe message - not connected');
      return;
    }

    const message: SubscribeMessage = {
      type: 'subscribe',
      symbols: symbols.map(s => s.toUpperCase()),
    };

    this.ws.send(JSON.stringify(message));
    console.log('[WebSocket] Sent subscribe message:', message);
  }

  /**
   * Send unsubscribe message to server
   */
  private sendUnsubscribeMessage(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send unsubscribe message - not connected');
      return;
    }

    const message: UnsubscribeMessage = {
      type: 'unsubscribe',
      symbols: symbols.map(s => s.toUpperCase()),
    };

    this.ws.send(JSON.stringify(message));
    console.log('[WebSocket] Sent unsubscribe message:', message);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
      this.handleError('Failed to reconnect after maximum attempts');
      return;
    }

    this.setConnectionStatus(ConnectionStatus.RECONNECTING);
    this.reconnectAttempts++;

    console.log(
      `[WebSocket] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff with max delay
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
  }

  /**
   * Set connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus === status) return;
    
    this.connectionStatus = status;
    console.log('[WebSocket] Connection status changed to:', status);

    this.connectionStatusListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[WebSocket] Error in connection status callback:', error);
      }
    });
  }

  /**
   * Handle errors and notify listeners
   */
  private handleError(message: string): void {
    this.errorListeners.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[WebSocket] Error in error callback:', error);
      }
    });
  }
}

// Export singleton instance
export default WebSocketService.getInstance();
