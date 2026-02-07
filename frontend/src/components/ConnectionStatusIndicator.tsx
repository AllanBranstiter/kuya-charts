/**
 * Connection Status Indicator Component
 * Displays real-time WebSocket connection status
 */

import { useWebSocketStatus } from '../hooks/useWebSocket';
import { ConnectionStatus } from '../types/realtime';

interface ConnectionStatusIndicatorProps {
  showLabel?: boolean;
  position?: 'inline' | 'fixed';
  className?: string;
}

export default function ConnectionStatusIndicator({
  showLabel = true,
  position = 'inline',
  className = '',
}: ConnectionStatusIndicatorProps) {
  const { status } = useWebSocketStatus();

  // Determine status display
  const getStatusDisplay = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return {
          color: 'bg-green-500',
          label: 'Live',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
          ),
          pulse: true,
        };
      case ConnectionStatus.CONNECTING:
        return {
          color: 'bg-yellow-500',
          label: 'Connecting',
          icon: (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ),
          pulse: false,
        };
      case ConnectionStatus.RECONNECTING:
        return {
          color: 'bg-orange-500',
          label: 'Reconnecting',
          icon: (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ),
          pulse: false,
        };
      case ConnectionStatus.DISCONNECTED:
      default:
        return {
          color: 'bg-gray-400',
          label: 'Offline',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
          ),
          pulse: false,
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Don't show if position is fixed and status is disconnected (to avoid clutter)
  if (position === 'fixed' && status === ConnectionStatus.DISCONNECTED) {
    return null;
  }

  const baseClasses = position === 'fixed'
    ? 'fixed bottom-4 right-4 z-50'
    : '';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${baseClasses} ${className}`}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
      }}
      title={`WebSocket status: ${statusDisplay.label}`}
    >
      {/* Status indicator dot with optional pulse animation */}
      <div className="relative flex items-center justify-center">
        <div className={`h-2 w-2 rounded-full ${statusDisplay.color}`} />
        {statusDisplay.pulse && (
          <div
            className={`absolute h-2 w-2 rounded-full ${statusDisplay.color} animate-ping opacity-75`}
          />
        )}
      </div>

      {/* Status label */}
      {showLabel && (
        <span
          className="text-xs font-medium whitespace-nowrap"
          style={{ color: 'var(--text-secondary)' }}
        >
          {statusDisplay.label}
        </span>
      )}
    </div>
  );
}

/**
 * Compact version for header/navbar
 */
export function ConnectionStatusBadge({ className = '' }: { className?: string }) {
  return (
    <ConnectionStatusIndicator
      showLabel={false}
      position="inline"
      className={`px-2 py-2 ${className}`}
    />
  );
}

/**
 * Full version with label for dedicated display area
 */
export function ConnectionStatusLabel({ className = '' }: { className?: string }) {
  return (
    <ConnectionStatusIndicator
      showLabel={true}
      position="inline"
      className={className}
    />
  );
}

/**
 * Fixed position indicator (bottom-right corner)
 */
export function ConnectionStatusFixed() {
  return (
    <ConnectionStatusIndicator
      showLabel={true}
      position="fixed"
    />
  );
}
