import { Router, Request, Response } from 'express';
import {
  createUser,
  findUserByEmail,
  findUserById,
  checkUserExists,
} from '../services/userService.js';
import { comparePassword, generateToken } from '../utils/auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { AuthenticatedRequest, RegisterPayload, LoginPayload } from '../types/auth.js';

const router = Router();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Username validation regex (alphanumeric and underscores only)
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

/**
 * POST /api/auth/register
 * Register a new user account
 * Body: { email, username, password }
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password } = req.body as RegisterPayload;

    // Validate required fields
    if (!email || !username || !password) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, username, and password are required',
      });
      return;
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
        message: 'Please provide a valid email address',
      });
      return;
    }

    // Validate username length
    if (username.length < 3 || username.length > 100) {
      res.status(400).json({
        success: false,
        error: 'Invalid username',
        message: 'Username must be between 3 and 100 characters',
      });
      return;
    }

    // Validate username format
    if (!USERNAME_REGEX.test(username)) {
      res.status(400).json({
        success: false,
        error: 'Invalid username',
        message: 'Username can only contain letters, numbers, and underscores',
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Weak password',
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await checkUserExists(email, username);
    
    if (existingUser.emailExists) {
      res.status(409).json({
        success: false,
        error: 'Email already exists',
        message: 'An account with this email already exists',
      });
      return;
    }

    if (existingUser.usernameExists) {
      res.status(409).json({
        success: false,
        error: 'Username already exists',
        message: 'This username is already taken',
      });
      return;
    }

    // Create the user
    const user = await createUser(email, username, password);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Return success response with token and user info
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);

    if (error instanceof Error) {
      // Handle duplicate errors (if checkUserExists missed something)
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Duplicate user',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create user account',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 * Body: { email, password }
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginPayload;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email and password are required',
      });
      return;
    }

    // Find user by email
    const user = await findUserByEmail(email);

    // Return generic error if user not found (don't reveal if email exists)
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
      return;
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Return success response with token and user info
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to authenticate user',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user's information
 * Requires authentication (JWT token in Authorization header)
 */
router.get(
  '/me',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // User info is attached by authenticateToken middleware
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      // Fetch full user details from database
      const user = await findUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User account no longer exists',
        });
        return;
      }

      // Return user information
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          created_at: user.created_at,
        },
      });
    } catch (error: unknown) {
      console.error('Get user info error:', error);

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve user information',
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout endpoint (JWT is stateless, so this is mainly for client-side consistency)
 * The client should remove the token from storage
 */
router.post('/logout', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
