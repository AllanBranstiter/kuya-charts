// User service for database operations related to users

import { query } from '../utils/db.js';
import { hashPassword } from '../utils/auth.js';
import { User } from '../types/auth.js';

// User without sensitive fields (for API responses)
export interface SafeUser {
  id: number;
  email: string;
  username: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a new user in the database
 * @param email - User's email address
 * @param username - User's chosen username
 * @param password - User's plain text password (will be hashed)
 * @returns Created user without password hash
 * @throws Error if email or username already exists
 */
export async function createUser(
  email: string,
  username: string,
  password: string
): Promise<SafeUser> {
  try {
    // Hash the password
    const passwordHash = await hashPassword(password);

    // Insert user into database
    const result = await query<User>(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at, updated_at`,
      [email, username, passwordHash]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    return result.rows[0];
  } catch (error: any) {
    // Handle unique constraint violations (duplicate email or username)
    if (error.code === '23505') {
      if (error.constraint === 'users_email_key') {
        throw new Error('Email already exists');
      }
      if (error.constraint === 'users_username_key') {
        throw new Error('Username already exists');
      }
      throw new Error('Email or username already exists');
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Find a user by email (includes password_hash for authentication)
 * @param email - User's email address
 * @returns User with password hash, or null if not found
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await query<User>(
      `SELECT id, email, username, password_hash, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw new Error('Failed to find user');
  }
}

/**
 * Find a user by ID (excludes password_hash)
 * @param id - User's ID
 * @returns User without password hash, or null if not found
 */
export async function findUserById(id: number): Promise<SafeUser | null> {
  try {
    const result = await query<SafeUser>(
      `SELECT id, email, username, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw new Error('Failed to find user');
  }
}

/**
 * Check if a user exists by email or username
 * @param email - Email to check
 * @param username - Username to check
 * @returns Object indicating which fields exist
 */
export async function checkUserExists(
  email: string,
  username: string
): Promise<{ emailExists: boolean; usernameExists: boolean }> {
  try {
    const result = await query<{ email: string; username: string }>(
      `SELECT email, username
       FROM users
       WHERE email = $1 OR username = $2`,
      [email, username]
    );

    const emailExists = result.rows.some(row => row.email === email);
    const usernameExists = result.rows.some(row => row.username === username);

    return { emailExists, usernameExists };
  } catch (error) {
    console.error('Error checking user existence:', error);
    throw new Error('Failed to check user existence');
  }
}
