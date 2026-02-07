import {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  AuthErrorResponse,
  User,
} from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'auth_token';

/**
 * Get the stored auth token from localStorage
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store auth token in localStorage
 */
export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove auth token from localStorage
 */
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Register a new user
 * @param credentials - User registration credentials
 * @returns Promise with auth response (token and user)
 * @throws Error if registration fails
 */
export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData: AuthErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to register');
    }

    const data: AuthResponse = await response.json();
    
    // Store token in localStorage
    setStoredToken(data.token);
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred during registration');
  }
}

/**
 * Login an existing user
 * @param credentials - User login credentials
 * @returns Promise with auth response (token and user)
 * @throws Error if login fails
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData: AuthErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to login');
    }

    const data: AuthResponse = await response.json();
    
    // Store token in localStorage
    setStoredToken(data.token);
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred during login');
  }
}

/**
 * Logout the current user
 * Clears the token from localStorage and calls the logout endpoint
 */
export async function logout(): Promise<void> {
  try {
    const token = getStoredToken();
    
    if (token) {
      // Call backend logout endpoint
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Continue with local logout even if API call fails
  } finally {
    // Always clear local token
    clearStoredToken();
  }
}

/**
 * Get the current authenticated user
 * @returns Promise with user data
 * @throws Error if not authenticated or request fails
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const token = getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        clearStoredToken();
      }
      
      const errorData: AuthErrorResponse = await response.json();
      throw new Error(errorData.message || 'Failed to get current user');
    }

    const data: User = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching user data');
  }
}

/**
 * Check if user is authenticated (has a valid token)
 * @returns Promise with boolean indicating authentication status
 */
export async function checkAuth(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch (error) {
    return false;
  }
}
