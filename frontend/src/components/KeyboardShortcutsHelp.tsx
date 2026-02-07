import { useEffect } from 'react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  key: string;
  description: string;
  display?: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Global',
    shortcuts: [
      { key: '?', description: 'Show keyboard shortcuts help', display: '?' },
      { key: 't', description: 'Toggle theme (dark/light)', display: 'T' },
      { key: 'Escape', description: 'Close modals/panels', display: 'Esc' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'h', description: 'Go to screener page', display: 'H' },
      { key: 'c', description: 'Go to chart page', display: 'C' },
      { key: 'w', description: 'Go to watchlist page', display: 'W' },
    ],
  },
  {
    title: 'Chart Page',
    shortcuts: [
      { key: ' ', description: 'Toggle indicator panel', display: 'Space' },
      { key: 'e', description: 'Export chart as PNG', display: 'E' },
    ],
  },
  {
    title: 'Screener Page',
    shortcuts: [
      { key: 'f', description: 'Toggle filter panel', display: 'F' },
      { key: 'e', description: 'Export results as CSV', display: 'E' },
    ],
  },
];

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <h2
            className="text-xl sm:text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-opacity-10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{
              backgroundColor: 'var(--bg-secondary)',
            }}
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              style={{ color: 'var(--text-secondary)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {SHORTCUT_GROUPS.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, shortcutIndex) => (
                  <div
                    key={shortcutIndex}
                    className="flex items-center justify-between py-2 px-3 rounded-md"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <span
                      className="text-sm sm:text-base"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {shortcut.description}
                    </span>
                    <kbd
                      className="px-3 py-1.5 rounded text-xs sm:text-sm font-mono font-semibold shadow-sm min-w-[44px] text-center"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)',
                      }}
                    >
                      {shortcut.display || shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 px-6 py-4 flex justify-end"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderTop: '1px solid var(--border-primary)',
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-white transition-colors min-h-[44px]"
            style={{ backgroundColor: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
