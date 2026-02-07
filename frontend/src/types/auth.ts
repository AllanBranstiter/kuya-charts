/**
 * User interface representing authenticated user data
 */
export interface User {
  id: number;
  email: string;
  username: string;
  created_at?: string;
}

/**
 * Auth state interface for the authentication context
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Register credentials interface
 */
export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
}

/**
 * API response for authentication endpoints
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * API error response interface
 */
export interface AuthErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}
