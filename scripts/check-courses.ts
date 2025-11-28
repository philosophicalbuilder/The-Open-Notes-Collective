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

async function checkCourses() {
  let connection: mysql.Connection | null = null;

  try {
        console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
        console.log('Connected successfully!\n');

    const [courses]: any = await connection.execute(
      `SELECT course_id, name, code, section_id, semester_id, instructor_id
       FROM courses 
       ORDER BY name, code, section_id`
    );

    console.log(`Found ${courses.length} courses:\n`);
    for (const course of courses) {
      console.log(`ID: ${course.course_id} | ${course.name} | Code: "${course.code}" | Section: ${course.section_id} | Semester: ${course.semester_id} | Instructor: ${course.instructor_id}`);
    }

  } catch (error: any) {
    console.error('\n Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkCourses()
  .then(() => {
    console.log('\n Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n Failed:', error);
    process.exit(1);
  });

