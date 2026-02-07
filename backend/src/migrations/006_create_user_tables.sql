-- Migration 006: Create User Tables
-- Purpose: Implement user authentication and personalization features
-- Phase 5: Real-time & Advanced Features - User Accounts
-- Date: 2026-02-06

-- ============================================================================
-- TABLE: users
-- Purpose: Store user account information for authentication
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast email lookups during authentication
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

COMMENT ON TABLE users IS 'User accounts for authentication and personalization';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hashed password - never store plain text';

-- ============================================================================
-- TABLE: user_watchlists
-- Purpose: Store user-specific stock watchlists
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_watchlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stock_symbol VARCHAR(10) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_stock UNIQUE (user_id, stock_symbol)
);

-- Index for fast user watchlist queries
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON user_watchlists(user_id);

-- Index for stock symbol lookups in watchlists
CREATE INDEX IF NOT EXISTS idx_watchlists_symbol ON user_watchlists(stock_symbol);

COMMENT ON TABLE user_watchlists IS 'User-specific stock watchlists for quick access';
COMMENT ON CONSTRAINT unique_user_stock ON user_watchlists IS 'Prevents duplicate stocks in a user watchlist';

-- ============================================================================
-- TABLE: user_chart_configs
-- Purpose: Store user-created chart configurations (indicators, layouts, drawings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_chart_configs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config_name VARCHAR(100) NOT NULL,
  config_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_config_name UNIQUE (user_id, config_name)
);

-- Index for fast user config queries
CREATE INDEX IF NOT EXISTS idx_chart_configs_user_id ON user_chart_configs(user_id);

-- GIN index for efficient JSONB queries on config_data
CREATE INDEX IF NOT EXISTS idx_chart_configs_data ON user_chart_configs USING GIN (config_data);

COMMENT ON TABLE user_chart_configs IS 'Saved chart configurations with indicators and layout settings';
COMMENT ON COLUMN user_chart_configs.config_data IS 'JSONB storing indicators, timeframe, drawings, layout preferences';

-- ============================================================================
-- TABLE: user_preferences
-- Purpose: Store user application preferences (theme, default settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'dark',
  default_timeframe VARCHAR(10) DEFAULT '1D',
  preferences_data JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GIN index for efficient JSONB queries on preferences_data
CREATE INDEX IF NOT EXISTS idx_preferences_data ON user_preferences USING GIN (preferences_data);

COMMENT ON TABLE user_preferences IS 'User application preferences and settings';
COMMENT ON COLUMN user_preferences.theme IS 'UI theme preference (dark, light, etc.)';
COMMENT ON COLUMN user_preferences.default_timeframe IS 'Default chart timeframe (1D, 1W, 1M, etc.)';
COMMENT ON COLUMN user_preferences.preferences_data IS 'Extensible JSONB field for additional preferences';

-- ============================================================================
-- TRIGGER: Update updated_at timestamp automatically
-- Purpose: Automatically update updated_at columns on row modifications
-- ============================================================================

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_chart_configs table
DROP TRIGGER IF EXISTS update_chart_configs_updated_at ON user_chart_configs;
CREATE TRIGGER update_chart_configs_updated_at
  BEFORE UPDATE ON user_chart_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_preferences table
DROP TRIGGER IF EXISTS update_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF MIGRATION 006
-- ============================================================================
