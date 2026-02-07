// Authentication types for the application

import { Request } from 'express';

// JWT payload structure
export interface JwtPayload {
  userId: number;
  email: string;
}

// Extended Express Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Auth response types
export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
  };
}

export interface RegisterResponse {
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
  };
}

// User data structure (for database operations)
export interface User {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

// User registration/login request payloads
export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
