import mysql from 'mysql2/promise';

// Database config for app_user (authenticated users)
const appDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || process.env.DB_APP_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_APP_PASSWORD || '',
  database: process.env.DB_NAME || 'open_notes_collective',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_HOST?.includes('railway') || process.env.DB_HOST?.includes('rlwy')
    ? { rejectUnauthorized: false }
    : undefined,
};

// Database config for readonly_user (guests)
const readonlyDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_READONLY_USER || 'readonly_user',
  password: process.env.DB_READONLY_PASSWORD || 'secure_readonly_pw',
  database: process.env.DB_NAME || 'open_notes_collective',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_HOST?.includes('railway') || process.env.DB_HOST?.includes('rlwy')
    ? { rejectUnauthorized: false }
    : undefined,
};

// Create connection pools
let appPool: mysql.Pool | null = null;
let readonlyPool: mysql.Pool | null = null;

export function getPool(isGuest = false): mysql.Pool {
  if (isGuest) {
    // Use readonly_user for guests
    if (!readonlyPool) {
      readonlyPool = mysql.createPool(readonlyDbConfig);
    }
    return readonlyPool;
  } else {
    // Use app_user for authenticated users
    if (!appPool) {
      appPool = mysql.createPool(appDbConfig);
    }
    return appPool;
  }
}

// run a query (supports guest mode)
export async function query<T = any>(
  sql: string,
  params?: any[],
  isGuest = false
): Promise<T> {
  const connection = getPool(isGuest);
  const [results] = await connection.execute(sql, params);
  return results as T;
}

// get first row from query (supports guest mode)
export async function queryOne<T = any>(
  sql: string,
  params?: any[],
  isGuest = false
): Promise<T | null> {
  const results = await query<T[]>(sql, params, isGuest);
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

