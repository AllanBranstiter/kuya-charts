/**
 * Real-time WebSocket types for live price updates
 */

// Connection status enum
export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
}

// Real-time price update data from backend
export interface RealtimePriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  volume?: number;
}

// WebSocket message types
export type WebSocketMessageType = 'subscribe' | 'unsubscribe' | 'price_update' | 'error' | 'connected';

// Outgoing messages (client -> server)
export interface SubscribeMessage {
  type: 'subscribe';
  symbols: string[];
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  symbols: string[];
}

// Incoming messages (server -> client)
export interface PriceUpdateMessage {
  type: 'price_update';
  data: RealtimePriceUpdate;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface ConnectedMessage {
  type: 'connected';
  message: string;
}

// Union type for all WebSocket messages
export type WebSocketMessage = 
  | SubscribeMessage 
  | UnsubscribeMessage 
  | PriceUpdateMessage 
  | ErrorMessage
  | ConnectedMessage;

// Callback types
export type PriceUpdateCallback = (update: RealtimePriceUpdate) => void;
export type ConnectionStatusCallback = (status: ConnectionStatus) => void;
export type ErrorCallback = (error: string) => void;
