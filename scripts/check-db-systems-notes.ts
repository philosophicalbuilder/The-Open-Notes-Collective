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

async function checkNotes() {
    let connection: mysql.Connection | null = null;

    try {
        console.log('🔌 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected successfully!\n');

        // Get Database Systems course ID
        const [courses]: any = await connection.execute(
            `SELECT course_id, name, code FROM courses WHERE name = 'Database Systems'`
        );

        if (courses.length === 0) {
            console.log('❌ Database Systems course not found!');
            return;
        }

        const courseId = courses[0].course_id;
        console.log(`📚 Course: ${courses[0].name} [${courses[0].code}] (ID: ${courseId})\n`);

        // Get enrolled students
        const [enrollments]: any = await connection.execute(
            `SELECT u.user_id, u.computing_id, u.first_name, u.last_name
       FROM enrollments e
       JOIN users u ON e.student_id = u.user_id
       WHERE e.course_id = ?`,
            [courseId]
        );

        console.log(`👥 Enrolled students (${enrollments.length}):`);
        for (const student of enrollments) {
            console.log(`   - ${student.first_name} ${student.last_name} (${student.computing_id}) - ID: ${student.user_id}`);
        }

        // Get existing notes
        const [notes]: any = await connection.execute(
            `SELECT n.note_id, n.title, n.lecture, u.first_name, u.last_name, n.created_at
       FROM notes n
       JOIN users u ON n.author_id = u.user_id
       WHERE n.course_id = ?
       ORDER BY n.created_at DESC`,
            [courseId]
        );

        console.log(`\n📄 Existing notes (${notes.length}):`);
        for (const note of notes) {
            console.log(`   - "${note.title}" (${note.lecture}) by ${note.first_name} ${note.last_name} - ${new Date(note.created_at).toLocaleDateString()}`);
        }

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkNotes()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed:', error);
        process.exit(1);
    });

