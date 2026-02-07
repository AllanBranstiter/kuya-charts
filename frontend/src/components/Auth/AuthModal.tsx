import { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);

  // Reset mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
    }
  }, [isOpen, defaultMode]);

  // Handle successful auth
  const handleSuccess = () => {
    onClose();
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
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
        className="relative rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-md transition-colors"
          style={{ 
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          aria-label="Close modal"
        >
          <svg 
            className="w-6 h-6" 
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

        {/* Auth Forms */}
        <div className="mt-4">
          {mode === 'login' ? (
            <Login 
              onSuccess={handleSuccess} 
              onSwitchToRegister={() => setMode('register')} 
            />
          ) : (
            <Register 
              onSuccess={handleSuccess} 
              onSwitchToLogin={() => setMode('login')} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
