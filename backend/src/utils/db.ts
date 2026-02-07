import pg, { QueryResultRow } from 'pg';

const { Pool } = pg;

// PostgreSQL connection pool configuration
// Connection string format: postgresql://username:password@host:port/database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual environment variables if DATABASE_URL is not set
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kuya_charts',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Test database connection
 * @returns Promise<boolean> - true if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Execute a query with optional parameters
 * @param text - SQL query string
 * @param params - Query parameters
 * @returns Query result
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * Remember to call client.release() when done!
 */
export async function getClient(): Promise<pg.PoolClient> {
  return await pool.connect();
}

/**
 * Close all connections in the pool
 * Should be called when shutting down the application
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database pool closed');
}

export default pool;
