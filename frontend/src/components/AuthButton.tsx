import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './Auth/AuthModal';

export default function AuthButton() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  const handleOpenLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleOpenRegister = () => {
    setAuthMode('register');
    setShowAuthModal(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div 
          className="animate-spin rounded-full h-5 w-5 border-b-2"
          style={{ borderColor: 'var(--accent)' }}
        ></div>
      </div>
    );
  }

  // Authenticated state
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <span 
          className="text-sm font-medium hidden sm:inline"
          style={{ color: 'var(--text-primary)' }}
        >
          {user.username}
        </span>
        <button
          onClick={handleLogout}
          className="px-3 py-2 rounded-md transition-colors text-sm font-medium min-h-[44px]"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
        >
          Logout
        </button>
      </div>
    );
  }

  // Not authenticated state
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleOpenLogin}
          className="px-3 py-2 rounded-md transition-colors text-sm font-medium min-h-[44px]"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
        >
          Login
        </button>
        <button
          onClick={handleOpenRegister}
          className="px-3 py-2 rounded-md text-white transition-colors text-sm font-medium min-h-[44px]"
          style={{ backgroundColor: 'var(--accent)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
        >
          Sign Up
        </button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </>
  );
}
