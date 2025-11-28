import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true, // Allow multiple SQL statements
    ssl: {
      rejectUnauthorized: false, // Railway uses self-signed certificates
    },
  });

  try {
        console.log('Connected to database');
    
    // Read the schema file
    const schemaPath = path.join(process.cwd(), 'database-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
        console.log('Reading schema file...');
    
    // Split by semicolons and execute each statement
    // Remove comments and split properly
    const cleanedSchema = schema
      .split('\n')
      .map(line => {
        // Remove inline comments
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex);
        }
        return line;
      })
      .join('\n');
    
    const statements = cleanedSchema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length > 10); // Filter out empty or very short statements
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute all statements
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await connection.query(statement);
          console.log(`Executed statement ${i + 1}/${statements.length}`);
        } catch (error: any) {
          // Ignore "table already exists" errors
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message?.includes('already exists')) {
            console.log(` Statement ${i + 1}: Table already exists (skipping)`);
          } else {
            console.error(` Error in statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('\n Database setup complete! All tables created successfully.');
    
    // Verify tables were created
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`\n Created tables: ${(tables as any[]).length}`);
    (tables as any[]).forEach((table: any) => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
  } catch (error: any) {
    console.error(' Error setting up database:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log('\n Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n Setup failed:', error);
    process.exit(1);
  });

