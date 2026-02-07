import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthState, LoginCredentials, RegisterCredentials } from '../types/auth';
import * as authApi from '../services/authApi';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider component that wraps the app and provides authentication state and actions
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  /**
   * Check authentication status on mount
   */
  const checkAuth = useCallback(async () => {
    const token = authApi.getStoredToken();
    
    if (!token) {
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    try {
      const user = await authApi.getCurrentUser();
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      // Token is invalid, clear it
      authApi.clearStoredToken();
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  /**
   * Check auth on initial mount
   */
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Login handler
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);
      setAuthState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  /**
   * Register handler
   */
  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      const response = await authApi.register(credentials);
      setAuthState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, []);

  /**
   * Logout handler
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use the auth context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
