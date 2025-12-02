import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function setupPrivileges() {
  // Use admin credentials (root or existing DB_USER) to create new users
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root', // Use admin user to create other users
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'open_notes_collective',
    multipleStatements: true,
    ssl: process.env.DB_HOST?.includes('railway') || process.env.DB_HOST?.includes('rlwy')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    console.log('Connected to database as admin');
    
    // Read the privileges file
    const privilegesPath = path.join(process.cwd(), 'scripts', 'database-privileges.sql');
    const privileges = fs.readFileSync(privilegesPath, 'utf-8');
    
    console.log('Reading privileges file...');
    
    // Split by semicolons and execute each statement
    const statements = privileges
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute all statements
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await connection.execute(statement);
          console.log(`Statement ${i + 1} executed successfully`);
        } catch (error: any) {
          // If user already exists, that's okay
          if (error.code === 'ER_USER_ALREADY_EXISTS' || 
              error.code === 'ER_CANNOT_USER' || 
              error.message?.includes('already exists') ||
              error.message?.includes('CREATE USER failed')) {
            console.log(`User may already exist, skipping CREATE USER...`);
          } 
          // If privilege doesn't exist (for REVOKE), that's okay too
          else if (error.code === 'ER_NONEXISTING_GRANT' || error.message?.includes('no such grant')) {
            console.log(`Privilege not granted (nothing to revoke), skipping...`);
          } 
          else {
            console.error(`Error executing statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('\nAll privilege commands executed successfully!');
    console.log('\nUsers created:');
    console.log('  - app_user (SELECT, INSERT, UPDATE)');
    console.log('  - readonly_user (SELECT only)');
    console.log('\nMake sure to set these environment variables:');
    console.log('  DB_APP_USER=app_user');
    console.log('  DB_APP_PASSWORD=secure_pw');
    console.log('  DB_READONLY_USER=readonly_user');
    console.log('  DB_READONLY_PASSWORD=secure_readonly_pw');
    
  } catch (error: any) {
    console.error('Error setting up privileges:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\nDatabase connection closed');
  }
}

setupPrivileges().catch(console.error);

