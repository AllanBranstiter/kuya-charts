import { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function Register({ onSuccess, onSwitchToLogin }: RegisterProps) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!email || !username || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Username validation (3-100 characters)
    if (username.length < 3 || username.length > 100) {
      setError('Username must be between 3 and 100 characters');
      return false;
    }

    // Password validation (minimum 8 characters)
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    // Password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await register({ email, username, password });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
        Create Your Account
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label 
            htmlFor="email" 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 rounded-md border transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            placeholder="your@email.com"
            autoComplete="email"
            required
          />
        </div>

        {/* Username Input */}
        <div>
          <label 
            htmlFor="username" 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 rounded-md border transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            placeholder="Choose a username"
            autoComplete="username"
            minLength={3}
            maxLength={100}
            required
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            3-100 characters
          </p>
        </div>

        {/* Password Input */}
        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 rounded-md border transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Minimum 8 characters
          </p>
        </div>

        {/* Confirm Password Input */}
        <div>
          <label 
            htmlFor="confirmPassword" 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 rounded-md border transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="rounded-md p-3 border"
            style={{
              backgroundColor: 'var(--color-error-bg)',
              borderColor: 'var(--color-error)',
              color: 'var(--color-error)',
            }}
          >
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--accent)' }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating account...
            </span>
          ) : (
            'Sign Up'
          )}
        </button>
      </form>

      {/* Switch to Login */}
      {onSwitchToLogin && (
        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-medium hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Log in
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
