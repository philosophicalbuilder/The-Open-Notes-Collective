import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

async function addLecturesTable() {
    let connection: mysql.Connection | null = null;

    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected successfully!\n');

        // Add lectures table
        console.log('Creating lectures table...');
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS lectures (
        lecture_id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        lecture_date DATE NOT NULL,
        topic VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
        INDEX idx_course (course_id),
        INDEX idx_date (lecture_date),
        UNIQUE KEY unique_lecture (course_id, lecture_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('Lectures table created.\n');

        // Add lecture_id column to notes table if it doesn't exist
        console.log('Adding lecture_id column to notes table...');
        try {
            await connection.execute(`
        ALTER TABLE notes 
        ADD COLUMN lecture_id INT NULL,
        ADD INDEX idx_lecture (lecture_id),
        ADD FOREIGN KEY (lecture_id) REFERENCES lectures(lecture_id) ON DELETE SET NULL
      `);
            console.log('lecture_id column added to notes table.\n');
        } catch (error: any) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('lecture_id column already exists in notes table.\n');
            } else {
                throw error;
            }
        }

        console.log('Migration complete!');
    } catch (error: any) {
        console.error('Error running migration:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

addLecturesTable()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });

