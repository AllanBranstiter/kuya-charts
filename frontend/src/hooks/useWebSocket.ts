/**
 * React hooks for WebSocket real-time price updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';
import { ConnectionStatus, RealtimePriceUpdate } from '../types/realtime';

/**
 * Hook to get real-time price for a specific symbol
 * Automatically subscribes/unsubscribes based on component lifecycle
 * 
 * @param symbol - Stock symbol to subscribe to (e.g., "AAPL")
 * @param enabled - Whether to enable the subscription (default: true)
 * @returns Object with price data, connection status, and loading state
 */
export function useRealtimePrice(symbol: string | null, enabled = true) {
  const [priceData, setPriceData] = useState<RealtimePriceUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track if we've received at least one update
  const hasReceivedUpdate = useRef(false);

  // Debounce rapid updates to prevent excessive re-renders
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<RealtimePriceUpdate | null>(null);

  const debouncedSetPriceData = useCallback((update: RealtimePriceUpdate) => {
    pendingUpdateRef.current = update;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (pendingUpdateRef.current) {
        setPriceData(pendingUpdateRef.current);
        hasReceivedUpdate.current = true;
        setIsLoading(false);
      }
    }, 100); // 100ms debounce
  }, []);

  useEffect(() => {
    if (!symbol || !enabled) {
      setIsLoading(false);
      return;
    }

    const upperSymbol = symbol.toUpperCase();
    setIsLoading(true);

    // Price update handler
    const handlePriceUpdate = (update: RealtimePriceUpdate) => {
      debouncedSetPriceData(update);
    };

    // Connection status handler
    const handleConnectionStatus = (status: ConnectionStatus) => {
      setIsConnected(status === ConnectionStatus.CONNECTED);
      if (status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.RECONNECTING) {
        if (!hasReceivedUpdate.current) {
          setIsLoading(false);
        }
      }
    };

    // Error handler
    const handleError = (errorMessage: string) => {
      setError(errorMessage);
      setIsLoading(false);
    };

    // Add listeners
    websocketService.addPriceUpdateListener(upperSymbol, handlePriceUpdate);
    websocketService.addConnectionStatusListener(handleConnectionStatus);
    websocketService.addErrorListener(handleError);

    // Subscribe to symbol
    websocketService.subscribe([upperSymbol]);

    // Cleanup on unmount or symbol change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      websocketService.removePriceUpdateListener(upperSymbol, handlePriceUpdate);
      websocketService.removeConnectionStatusListener(handleConnectionStatus);
      websocketService.removeErrorListener(handleError);
      websocketService.unsubscribe([upperSymbol]);
      
      // Reset state
      hasReceivedUpdate.current = false;
    };
  }, [symbol, enabled, debouncedSetPriceData]);

  return {
    price: priceData?.price,
    change: priceData?.change,
    changePercent: priceData?.changePercent,
    timestamp: priceData?.timestamp,
    volume: priceData?.volume,
    isConnected,
    isLoading,
    error,
    priceData, // Full price data object
  };
}

/**
 * Hook to subscribe to multiple symbols at once
 * Useful for screener/watchlist where multiple symbols are displayed
 * 
 * @param symbols - Array of stock symbols to subscribe to
 * @param enabled - Whether to enable the subscriptions (default: true)
 * @returns Object with price updates map, connection status
 */
export function useRealtimePrices(symbols: string[], enabled = true) {
  const [priceUpdates, setPriceUpdates] = useState<Map<string, RealtimePriceUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track which symbols have received updates
  const receivedUpdatesRef = useRef<Set<string>>(new Set());

  // Debounce map updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, RealtimePriceUpdate>>(new Map());

  const debouncedUpdatePrices = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (pendingUpdatesRef.current.size > 0) {
        setPriceUpdates(new Map(pendingUpdatesRef.current));
      }
    }, 150); // 150ms debounce for batch updates
  }, []);

  useEffect(() => {
    if (!symbols || symbols.length === 0 || !enabled) {
      setIsLoading(false);
      return;
    }

    const upperSymbols = symbols.map(s => s.toUpperCase());
    setIsLoading(true);
    receivedUpdatesRef.current.clear();

    // Create a single handler for all symbols
    const handlePriceUpdate = (update: RealtimePriceUpdate) => {
      const symbol = update.symbol.toUpperCase();
      pendingUpdatesRef.current.set(symbol, update);
      receivedUpdatesRef.current.add(symbol);
      
      // Check if we've received updates for all symbols
      if (receivedUpdatesRef.current.size === upperSymbols.length) {
        setIsLoading(false);
      }
      
      debouncedUpdatePrices();
    };

    // Connection status handler
    const handleConnectionStatus = (status: ConnectionStatus) => {
      setIsConnected(status === ConnectionStatus.CONNECTED);
      if (status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.RECONNECTING) {
        if (receivedUpdatesRef.current.size === 0) {
          setIsLoading(false);
        }
      }
    };

    // Add listeners for all symbols
    upperSymbols.forEach(symbol => {
      websocketService.addPriceUpdateListener(symbol, handlePriceUpdate);
    });
    websocketService.addConnectionStatusListener(handleConnectionStatus);

    // Subscribe to all symbols
    websocketService.subscribe(upperSymbols);

    // Timeout to stop loading after 5 seconds even if no updates received
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    // Cleanup
    return () => {
      clearTimeout(loadingTimeout);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      upperSymbols.forEach(symbol => {
        websocketService.removePriceUpdateListener(symbol, handlePriceUpdate);
      });
      websocketService.removeConnectionStatusListener(handleConnectionStatus);
      websocketService.unsubscribe(upperSymbols);

      // Clear state
      pendingUpdatesRef.current.clear();
      receivedUpdatesRef.current.clear();
    };
  }, [symbols.join(','), enabled, debouncedUpdatePrices]);

  return {
    priceUpdates,
    isConnected,
    isLoading,
  };
}

/**
 * Hook to get WebSocket connection status
 * Useful for displaying connection indicators
 * 
 * @returns Current connection status
 */
export function useWebSocketStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(
    websocketService.getConnectionStatus()
  );

  useEffect(() => {
    const handleStatusChange = (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
    };

    websocketService.addConnectionStatusListener(handleStatusChange);

    return () => {
      websocketService.removeConnectionStatusListener(handleStatusChange);
    };
  }, []);

  return {
    status,
    isConnected: status === ConnectionStatus.CONNECTED,
    isConnecting: status === ConnectionStatus.CONNECTING,
    isReconnecting: status === ConnectionStatus.RECONNECTING,
    isDisconnected: status === ConnectionStatus.DISCONNECTED,
  };
}
