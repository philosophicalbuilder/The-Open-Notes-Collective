import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'open_notes_collective',
  ssl: process.env.DB_HOST?.includes('railway') || process.env.DB_HOST?.includes('rlwy')
    ? { rejectUnauthorized: false }
    : undefined,
};

async function runMigration() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'add-threading-to-note-requests.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const cleaned = s.replace(/--.*$/gm, '').trim(); // Remove comments
        return cleaned.length > 0;
      })
      .map(s => s.replace(/--.*$/gm, '').trim()); // Clean comments from statements

    console.log(`Running ${statements.length} migration statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        try {
          await connection.execute(statement);
          console.log(`Statement ${i + 1} executed successfully`);
        } catch (error: any) {
          // Check if it's a "duplicate column" error (already migrated)
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`Column already exists, skipping...`);
          } else if (error.code === 'ER_DUP_KEYNAME') {
            console.log(`Index/constraint already exists, skipping...`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\nMigration completed successfully!');
  } catch (error: any) {
    console.error('\n Migration failed:');
    console.error(error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

runMigration();

