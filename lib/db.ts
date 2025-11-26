import mysql from 'mysql2/promise';

// database config
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'open_notes_collective',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_HOST?.includes('railway') || process.env.DB_HOST?.includes('rlwy')
    ? { rejectUnauthorized: false }
    : undefined,
};

// Create connection pool
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// run a query
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T> {
  const connection = getPool();
  const [results] = await connection.execute(sql, params);
  return results as T;
}

// get first row from query
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const results = await query<T[]>(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = getPool();
    await connection.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

