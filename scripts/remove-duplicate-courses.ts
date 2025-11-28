import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

async function removeDuplicates() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!\n');

    // Delete courses with incorrect codes (where code = section_id)
    // These are duplicates of correctly coded courses
    console.log('🗑️  Removing duplicate courses with incorrect codes...\n');
    
    const coursesToDelete = [
      { id: 3, name: 'Human Computer Interaction', reason: 'Duplicate - code matches section_id, correct version exists (ID 6)' },
      { id: 2, name: 'Software Development', reason: 'Incorrect code (matches section_id), correct version exists (ID 5)' },
    ];

    for (const course of coursesToDelete) {
      console.log(`   Deleting Course ID ${course.id}: ${course.name}`);
      console.log(`   Reason: ${course.reason}\n`);

      await connection.execute(
        'DELETE FROM courses WHERE course_id = ?',
        [course.id]
      );
      
      console.log(`   ✅ Deleted course_id ${course.id}\n`);
    }

    console.log('✅ Duplicate removal complete!');

    // Verify remaining courses
    console.log('\n📋 Remaining courses:');
    const [remaining]: any = await connection.execute(
      `SELECT course_id, name, code, section_id 
       FROM courses 
       ORDER BY name, code, section_id`
    );

    for (const course of remaining) {
      console.log(`   ID ${course.course_id}: ${course.name} [${course.code}] Section ${course.section_id}`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

removeDuplicates()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

