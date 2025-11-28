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

async function fixDuplicates() {
    let connection: mysql.Connection | null = null;

    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected successfully!\n');

        // Find duplicate courses (same name, code, section_id, semester_id)
        console.log('Checking for duplicate courses...');
        const [duplicates]: any = await connection.execute(
            `SELECT 
        name, code, section_id, semester_id, 
        COUNT(*) as count,
        GROUP_CONCAT(course_id ORDER BY course_id) as course_ids
      FROM courses
      GROUP BY name, code, section_id, semester_id
      HAVING COUNT(*) > 1`
        );

        if (duplicates.length === 0) {
            console.log('No duplicate courses found!\n');
        } else {
            console.log(`Found ${duplicates.length} sets of duplicate courses:\n`);

            for (const dup of duplicates) {
                const courseIds = dup.course_ids.split(',').map((id: string) => parseInt(id.trim()));
                const keepId = courseIds[0]; // Keep the first one
                const deleteIds = courseIds.slice(1); // Delete the rest

                console.log(`  Course: ${dup.name} [${dup.code}] Section ${dup.section_id}`);
                console.log(`  Found ${dup.count} duplicates (IDs: ${courseIds.join(', ')})`);
                console.log(`  Keeping course_id: ${keepId}`);
                console.log(`  Will delete course_ids: ${deleteIds.join(', ')}\n`);

                // Delete duplicate courses (enrollments, notes, etc. will cascade)
                for (const deleteId of deleteIds) {
                    await connection.execute(
                        'DELETE FROM courses WHERE course_id = ?',
                        [deleteId]
                    );
                    console.log(`  Deleted course_id: ${deleteId}`);
                }
            }
        }

        // Also check for courses where code might be incorrectly set to section_id
        console.log('\nChecking for courses with incorrect code field...');
        const [incorrectCodes]: any = await connection.execute(
            `SELECT course_id, name, code, section_id 
       FROM courses 
       WHERE code = section_id`
        );

        if (incorrectCodes.length > 0) {
            console.log(`Found ${incorrectCodes.length} courses with code = section_id:\n`);
            for (const course of incorrectCodes) {
                console.log(`  Course ID ${course.course_id}: ${course.name} - code "${course.code}" matches section_id`);
                // We can't auto-fix this without knowing the correct code, so just report it
            }
        } else {
            console.log('No courses with incorrect code field found!');
        }

        console.log('\nDuplicate check and cleanup complete!');

    } catch (error: any) {
        console.error('\nError:', error.message);
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

fixDuplicates()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nFailed:', error);
        process.exit(1);
    });

