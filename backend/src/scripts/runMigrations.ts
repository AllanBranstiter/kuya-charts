/**
 * Database Migration Runner
 * 
 * This script runs SQL migrations in order to set up and update the database schema.
 * It tracks which migrations have been executed to prevent re-running them.
 * 
 * Run with: npm run migrate (from backend directory)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { query, testConnection, getClient } from '../utils/db.js';

// Load environment variables
dotenv.config();

// Get current directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  filename: string;
  version: number;
  sql: string;
}

/**
 * Create migrations tracking table if it doesn't exist
 * This table keeps track of which migrations have been executed
 */
async function createMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version INTEGER UNIQUE NOT NULL,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Migrations tracking table ready');
}

/**
 * Get list of already executed migrations from the database
 * @returns Array of version numbers that have been executed
 */
async function getExecutedMigrations(): Promise<number[]> {
  const result = await query<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC'
  );
  return result.rows.map(row => row.version);
}

/**
 * Load migration files from the migrations directory
 * @returns Array of Migration objects sorted by version
 */
function loadMigrationFiles(): Migration[] {
  const migrationsDir = join(__dirname, '../migrations');
  
  try {
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensures migrations run in order (001, 002, 003, etc.)

    const migrations: Migration[] = files.map(filename => {
      const filePath = join(migrationsDir, filename);
      const sql = readFileSync(filePath, 'utf-8');
      
      // Extract version number from filename (e.g., "006_create_user_tables.sql" -> 6)
      const versionMatch = filename.match(/^(\d+)_/);
      if (!versionMatch) {
        throw new Error(`Invalid migration filename format: ${filename}. Expected format: NNN_description.sql`);
      }
      
      const version = parseInt(versionMatch[1], 10);
      
      return {
        filename,
        version,
        sql,
      };
    });

    return migrations.sort((a, b) => a.version - b.version);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('No migrations directory found. Creating it...');
      return [];
    }
    throw error;
  }
}

/**
 * Execute a single migration
 * @param migration - Migration to execute
 */
async function executeMigration(migration: Migration): Promise<void> {
  const client = await getClient();
  
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Executing migration ${migration.version}: ${migration.filename}`);
    console.log('='.repeat(70));
    
    await client.query('BEGIN');
    
    // Execute the migration SQL
    await client.query(migration.sql);
    
    // Record the migration as executed
    await client.query(
      'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
      [migration.version, migration.filename]
    );
    
    await client.query('COMMIT');
    
    console.log(`✅ Migration ${migration.version} completed successfully`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Migration ${migration.version} failed:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  console.log('='.repeat(70));
  console.log('DATABASE MIGRATION RUNNER');
  console.log('='.repeat(70));

  try {
    // Step 1: Test database connection
    console.log('\n[1/4] Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Database connection failed!');
      console.error('Please ensure PostgreSQL is running and DATABASE_URL is set correctly.');
      console.error('Check your .env file or environment variables.');
      process.exit(1);
    }
    console.log('✅ Database connection successful');

    // Step 2: Create migrations tracking table
    console.log('\n[2/4] Setting up migrations tracking...');
    await createMigrationsTable();

    // Step 3: Load migration files
    console.log('\n[3/4] Loading migration files...');
    const migrations = loadMigrationFiles();
    console.log(`Found ${migrations.length} migration file(s)`);
    
    if (migrations.length === 0) {
      console.log('\n✅ No migrations to run');
      process.exit(0);
    }

    // Step 4: Execute pending migrations
    console.log('\n[4/4] Checking for pending migrations...');
    const executedVersions = await getExecutedMigrations();
    console.log(`Already executed: ${executedVersions.length} migration(s)`);
    
    const pendingMigrations = migrations.filter(
      m => !executedVersions.includes(m.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('\n✅ Database is up to date. No pending migrations.');
      process.exit(0);
    }

    console.log(`\nFound ${pendingMigrations.length} pending migration(s) to execute:`);
    pendingMigrations.forEach(m => {
      console.log(`  - ${m.filename}`);
    });

    // Execute each pending migration
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successfully executed ${pendingMigrations.length} migration(s)`);
    console.log(`Total migrations in database: ${executedVersions.length + pendingMigrations.length}`);
    console.log('='.repeat(70));
    console.log('✅ Database schema is up to date!');
    console.log('='.repeat(70));
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ Migration failed with error:');
    console.error('='.repeat(70));
    console.error(error);
    console.error('\nPlease check:');
    console.error('1. PostgreSQL is installed and running');
    console.error('2. Database connection settings in .env are correct');
    console.error('3. Database user has proper permissions');
    console.error('4. Migration SQL syntax is correct');
    process.exit(1);
  }
}

// Run the migration function
runMigrations();
