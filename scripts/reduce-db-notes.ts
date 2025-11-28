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

async function reduceNotes() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!\n');

    // Get Database Systems course ID
    const [courses]: any = await connection.execute(
      `SELECT course_id FROM courses WHERE name = 'Database Systems'`
    );

    if (courses.length === 0) {
      console.log('❌ Database Systems course not found!');
      return;
    }

    const courseId = courses[0].course_id;

    // Get all notes for this course
    const [allNotes]: any = await connection.execute(
      `SELECT note_id, title, lecture, author_id, created_at
       FROM notes
       WHERE course_id = ?
       ORDER BY created_at DESC`,
      [courseId]
    );

    console.log(`📄 Current notes: ${allNotes.length}`);
    console.log(`🎯 Target: 13 notes\n`);

    if (allNotes.length <= 13) {
      console.log('✅ Already at or below target!');
      return;
    }

    const toDelete = allNotes.length - 13;
    console.log(`🗑️  Need to delete ${toDelete} notes\n`);

    // Delete the most recent notes (keep the older ones)
    // Actually, let's keep a good distribution - delete some from authors who have many
    const notesToDelete = allNotes.slice(0, toDelete); // Delete the most recent ones

    for (const note of notesToDelete) {
      await connection.execute(
        'DELETE FROM notes WHERE note_id = ?',
        [note.note_id]
      );
      console.log(`   ✅ Deleted: "${note.title}" (${note.lecture})`);
    }

    // Verify final count
    const [finalCount]: any = await connection.execute(
      `SELECT COUNT(*) as count FROM notes WHERE course_id = ?`,
      [courseId]
    );

    console.log(`\n✅ Final count: ${finalCount[0].count} notes`);

    // Show distribution by author
    const [distribution]: any = await connection.execute(
      `SELECT 
        u.first_name,
        u.last_name,
        COUNT(*) as note_count
       FROM notes n
       JOIN users u ON n.author_id = u.user_id
       WHERE n.course_id = ?
       GROUP BY u.user_id, u.first_name, u.last_name
       ORDER BY note_count DESC`,
      [courseId]
    );

    console.log(`\n📊 Notes by author:`);
    for (const author of distribution) {
      console.log(`   ${author.first_name} ${author.last_name}: ${author.note_count} notes`);
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

reduceNotes()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

