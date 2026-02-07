import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface KeyboardShortcutHandlers {
  onToggleIndicators?: () => void;
  onExportChart?: () => void;
  onToggleFilters?: () => void;
  onExportCSV?: () => void;
  onToggleTheme?: () => void;
  onShowHelp?: () => void;
}

/**
 * Custom hook for handling keyboard shortcuts across the application
 * @param handlers - Object containing handler functions for various shortcuts
 * @param enabled - Whether shortcuts are enabled (default: true)
 */
export function useKeyboardShortcuts(
  handlers: KeyboardShortcutHandlers = {},
  enabled: boolean = true
) {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Check if the user is currently typing in an input field
   */
  const isTypingInInput = useCallback((event: KeyboardEvent): boolean => {
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isContentEditable = target.contentEditable === 'true';
    
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      isContentEditable
    );
  }, []);

  /**
   * Main keyboard event handler
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle shortcuts if disabled
      if (!enabled) return;

      // Don't handle shortcuts if user is typing in an input field
      if (isTypingInInput(event)) return;

      // Get the pressed key
      const key = event.key.toLowerCase();
      const { ctrlKey, metaKey, shiftKey, altKey } = event;

      // Prevent handling if modifier keys are pressed (except for specific shortcuts)
      const hasModifier = ctrlKey || metaKey || altKey;

      // Global Navigation Shortcuts
      if (!hasModifier) {
        switch (key) {
          case 'h':
            // Navigate to home/screener page
            event.preventDefault();
            navigate('/screener');
            break;

          case 'c':
            // Navigate to chart page
            event.preventDefault();
            navigate('/');
            break;

          case 'w':
            // Navigate to watchlist page
            event.preventDefault();
            navigate('/watchlist');
            break;

          case '?':
          case '/':
            // Show keyboard shortcuts help
            event.preventDefault();
            if (handlers.onShowHelp) {
              handlers.onShowHelp();
            }
            break;

          case 't':
            // Toggle theme
            event.preventDefault();
            if (handlers.onToggleTheme) {
              handlers.onToggleTheme();
            }
            break;

          case 'escape':
            // Close modals/panels
            event.preventDefault();
            // This will be handled by individual components
            break;
        }
      }

      // Chart Page Shortcuts
      if (location.pathname === '/' && !hasModifier) {
        switch (key) {
          case ' ':
            // Toggle indicator panel (Space)
            event.preventDefault();
            if (handlers.onToggleIndicators) {
              handlers.onToggleIndicators();
            }
            break;

          case 'e':
            // Export chart as PNG
            event.preventDefault();
            if (handlers.onExportChart) {
              handlers.onExportChart();
            }
            break;
        }
      }

      // Screener Page Shortcuts
      if (location.pathname === '/screener' && !hasModifier) {
        switch (key) {
          case 'f':
            // Toggle filters panel
            event.preventDefault();
            if (handlers.onToggleFilters) {
              handlers.onToggleFilters();
            }
            break;

          case 'e':
            // Export screener results as CSV
            event.preventDefault();
            if (handlers.onExportCSV) {
              handlers.onExportCSV();
            }
            break;
        }
      }
    },
    [
      enabled,
      handlers,
      navigate,
      location.pathname,
      isTypingInInput,
    ]
  );

  /**
   * Attach keyboard event listener
   */
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

export default useKeyboardShortcuts;
