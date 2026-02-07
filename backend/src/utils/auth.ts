// Authentication utility functions for password hashing and JWT operations

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';

// Configuration
const SALT_ROUNDS = 10;
const JWT_EXPIRATION = '24h';

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database
 * @returns True if passwords match, false otherwise
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    throw new Error('Failed to compare passwords');
  }
}

/**
 * Generate a JWT token for authenticated user
 * @param payload - User information to encode in token
 * @returns JWT token string
 */
export function generateToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    const token = jwt.sign(payload, secret, {
      expiresIn: JWT_EXPIRATION,
    });
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate token');
  }
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      console.error('Error verifying token:', error);
      throw new Error('Failed to verify token');
    }
  }
}
