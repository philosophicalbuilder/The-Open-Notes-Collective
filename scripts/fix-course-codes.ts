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

async function fixCourseCodes() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!\n');

    // Find courses where code = section_id (incorrect)
    console.log('🔍 Finding courses with incorrect codes...');
    const [incorrectCourses]: any = await connection.execute(
      `SELECT course_id, name, code, section_id 
       FROM courses 
       WHERE code = section_id`
    );

    if (incorrectCourses.length === 0) {
      console.log('✅ No courses with incorrect codes found!\n');
    } else {
      console.log(`⚠️  Found ${incorrectCourses.length} courses with incorrect codes:\n`);
      
      // Map of course names to their correct codes
      const courseCodeMap: { [key: string]: string } = {
        'Software Development Methods': 'CS 3240',
        'Human Computer Interaction': 'CS 3240',
        'Database Systems': 'CS 4750',
      };

      for (const course of incorrectCourses) {
        const correctCode = courseCodeMap[course.name];
        
        if (correctCode) {
          console.log(`   Course ID ${course.course_id}: ${course.name}`);
          console.log(`   Current code: "${course.code}" (incorrect - matches section_id)`);
          console.log(`   Updating to: "${correctCode}"\n`);

          await connection.execute(
            'UPDATE courses SET code = ? WHERE course_id = ?',
            [correctCode, course.course_id]
          );
          
          console.log(`   ✅ Updated course_id ${course.course_id}\n`);
        } else {
          console.log(`   ⚠️  Course ID ${course.course_id}: ${course.name} - No mapping found, skipping\n`);
        }
      }
    }

    console.log('✅ Course code fix complete!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

fixCourseCodes()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

