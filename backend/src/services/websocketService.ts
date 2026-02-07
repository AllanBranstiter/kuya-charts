import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';

/**
 * WebSocket message types
 */
export enum MessageType {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  PRICE_UPDATE = 'price_update',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
  PONG = 'pong',
}

/**
 * Client message interface
 */
interface ClientMessage {
  type: MessageType;
  symbol?: string;
}

/**
 * Price update data interface
 */
export interface PriceUpdateData {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  open?: number;
  high?: number;
  low?: number;
}

/**
 * Server message interface
 */
interface ServerMessage {
  type: MessageType;
  symbol?: string;
  data?: PriceUpdateData;
  message?: string;
}

/**
 * Client connection info
 */
interface ClientInfo {
  ws: WebSocket;
  subscriptions: Set<string>;
  isAlive: boolean;
}

/**
 * WebSocket Service for real-time stock price updates
 * 
 * Features:
 * - Connection management with automatic cleanup
 * - Symbol subscription tracking
 * - Heartbeat/ping-pong for dead connection detection
 * - Per-client subscription limits
 * - Efficient symbol-to-clients mapping for broadcasts
 */
class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private symbolSubscriptions: Map<string, Set<WebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly MAX_SUBSCRIPTIONS_PER_CLIENT = 50;
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT_MS = 5000; // 5 seconds

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer): void {
    if (this.wss) {
      console.warn('WebSocket server already initialized');
      return;
    }

    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    console.log('WebSocket server initialized on path: /ws');

    // Handle new connections
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    // Start heartbeat monitoring
    this.startHeartbeat();
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    console.log('New WebSocket connection established');

    // Initialize client info
    const clientInfo: ClientInfo = {
      ws,
      subscriptions: new Set(),
      isAlive: true,
    };

    this.clients.set(ws, clientInfo);

    // Set up event handlers
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnect(ws);
    });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.isAlive = true;
      }
    });
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case MessageType.SUBSCRIBE:
          if (message.symbol) {
            this.handleSubscribe(ws, message.symbol);
          } else {
            this.sendError(ws, 'Symbol is required for subscription');
          }
          break;

        case MessageType.UNSUBSCRIBE:
          if (message.symbol) {
            this.handleUnsubscribe(ws, message.symbol);
          } else {
            this.sendError(ws, 'Symbol is required for unsubscription');
          }
          break;

        case MessageType.PONG:
          // Client responded to heartbeat
          const client = this.clients.get(ws);
          if (client) {
            client.isAlive = true;
          }
          break;

        default:
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  /**
   * Handle client subscription to a symbol
   */
  private handleSubscribe(ws: WebSocket, symbol: string): void {
    const client = this.clients.get(ws);
    if (!client) {
      return;
    }

    // Validate symbol format (basic validation)
    const normalizedSymbol = symbol.toUpperCase().trim();
    if (!normalizedSymbol || normalizedSymbol.length > 10) {
      this.sendError(ws, 'Invalid symbol format');
      return;
    }

    // Check subscription limit
    if (client.subscriptions.size >= this.MAX_SUBSCRIPTIONS_PER_CLIENT) {
      this.sendError(ws, `Maximum subscriptions limit reached (${this.MAX_SUBSCRIPTIONS_PER_CLIENT})`);
      return;
    }

    // Add to client subscriptions
    client.subscriptions.add(normalizedSymbol);

    // Add to symbol subscriptions map
    if (!this.symbolSubscriptions.has(normalizedSymbol)) {
      this.symbolSubscriptions.set(normalizedSymbol, new Set());
    }
    this.symbolSubscriptions.get(normalizedSymbol)!.add(ws);

    console.log(`Client subscribed to ${normalizedSymbol}. Active symbols: ${this.symbolSubscriptions.size}`);
  }

  /**
   * Handle client unsubscription from a symbol
   */
  private handleUnsubscribe(ws: WebSocket, symbol: string): void {
    const client = this.clients.get(ws);
    if (!client) {
      return;
    }

    const normalizedSymbol = symbol.toUpperCase().trim();

    // Remove from client subscriptions
    client.subscriptions.delete(normalizedSymbol);

    // Remove from symbol subscriptions map
    const symbolClients = this.symbolSubscriptions.get(normalizedSymbol);
    if (symbolClients) {
      symbolClients.delete(ws);
      
      // Clean up empty symbol subscriptions
      if (symbolClients.size === 0) {
        this.symbolSubscriptions.delete(normalizedSymbol);
        console.log(`No more subscribers for ${normalizedSymbol}. Active symbols: ${this.symbolSubscriptions.size}`);
      }
    }

    console.log(`Client unsubscribed from ${normalizedSymbol}`);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) {
      return;
    }

    console.log('WebSocket connection closed');

    // Remove all subscriptions for this client
    client.subscriptions.forEach((symbol) => {
      const symbolClients = this.symbolSubscriptions.get(symbol);
      if (symbolClients) {
        symbolClients.delete(ws);
        if (symbolClients.size === 0) {
          this.symbolSubscriptions.delete(symbol);
        }
      }
    });

    // Remove client
    this.clients.delete(ws);

    console.log(`Active connections: ${this.clients.size}, Active symbols: ${this.symbolSubscriptions.size}`);
  }

  /**
   * Broadcast price update to all subscribed clients
   */
  broadcast(symbol: string, data: PriceUpdateData): void {
    const normalizedSymbol = symbol.toUpperCase();
    const subscribedClients = this.symbolSubscriptions.get(normalizedSymbol);

    if (!subscribedClients || subscribedClients.size === 0) {
      return;
    }

    const message: ServerMessage = {
      type: MessageType.PRICE_UPDATE,
      symbol: normalizedSymbol,
      data,
    };

    const messageStr = JSON.stringify(message);
    let successCount = 0;
    let errorCount = 0;

    subscribedClients.forEach((ws) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
          successCount++;
        }
      } catch (error) {
        console.error(`Error sending to client:`, error);
        errorCount++;
      }
    });

    if (successCount > 0) {
      console.log(`Broadcast ${normalizedSymbol} update to ${successCount} clients`);
    }
    if (errorCount > 0) {
      console.error(`Failed to send to ${errorCount} clients`);
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, message: string): void {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const errorMessage: ServerMessage = {
      type: MessageType.ERROR,
      message,
    };

    try {
      ws.send(JSON.stringify(errorMessage));
    } catch (error) {
      console.error('Error sending error message:', error);
    }
  }

  /**
   * Start heartbeat monitoring to detect dead connections
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        // Check if client responded to last ping
        if (!client.isAlive) {
          console.log('Client failed heartbeat check, terminating connection');
          ws.terminate();
          this.handleDisconnect(ws);
          return;
        }

        // Mark as not alive and send ping
        client.isAlive = false;
        try {
          ws.ping();
        } catch (error) {
          console.error('Error sending ping:', error);
          ws.terminate();
          this.handleDisconnect(ws);
        }
      });
    }, this.HEARTBEAT_INTERVAL_MS);

    console.log(`Heartbeat monitoring started (interval: ${this.HEARTBEAT_INTERVAL_MS}ms)`);
  }

  /**
   * Get list of currently subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.symbolSubscriptions.keys());
  }

  /**
   * Get number of active connections
   */
  getActiveConnections(): number {
    return this.clients.size;
  }

  /**
   * Get number of subscribers for a symbol
   */
  getSubscriberCount(symbol: string): number {
    const normalizedSymbol = symbol.toUpperCase();
    const subscribers = this.symbolSubscriptions.get(normalizedSymbol);
    return subscribers ? subscribers.size : 0;
  }

  /**
   * Shutdown WebSocket server gracefully
   */
  shutdown(): void {
    console.log('Shutting down WebSocket server...');

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    this.clients.forEach((client, ws) => {
      try {
        ws.close(1000, 'Server shutting down');
      } catch (error) {
        console.error('Error closing client connection:', error);
      }
    });

    // Close WebSocket server
    if (this.wss) {
      this.wss.close(() => {
        console.log('WebSocket server closed');
      });
      this.wss = null;
    }

    // Clear data structures
    this.clients.clear();
    this.symbolSubscriptions.clear();

    console.log('WebSocket server shutdown complete');
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
