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

async function addNotes() {
    let connection: mysql.Connection | null = null;

    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected successfully!\n');

        // Get Database Systems course ID
        const [courses]: any = await connection.execute(
            `SELECT course_id FROM courses WHERE name = 'Database Systems'`
        );

        if (courses.length === 0) {
        console.log('Database Systems course not found!');
            return;
        }

        const courseId = courses[0].course_id;
        console.log(`Course ID: ${courseId}\n`);

        // Get enrolled students
        const [enrollments]: any = await connection.execute(
            `SELECT u.user_id, u.first_name, u.last_name
       FROM enrollments e
       JOIN users u ON e.student_id = u.user_id
       WHERE e.course_id = ?`,
            [courseId]
        );

        if (enrollments.length === 0) {
        console.log('No enrolled students found!');
            return;
        }

        console.log(`Found ${enrollments.length} enrolled students\n`);

        // Create a variety of notes from different students
        const notes = [
            // Lisa Wang notes
            {
                title: 'ER Diagrams and Entity Relationships',
                description: 'Comprehensive guide to Entity-Relationship diagrams, including entities, attributes, relationships, and cardinality. Covers one-to-one, one-to-many, and many-to-many relationships with examples.',
                lecture: 'Lecture 2',
                author_id: enrollments.find((e: any) => e.first_name === 'Lisa')?.user_id,
                link: 'https://drive.google.com/file/d/lisa_er_diagrams',
            },
            {
                title: 'SQL Subqueries and Nested Queries',
                description: 'Detailed notes on writing subqueries in SQL, including correlated and non-correlated subqueries. Examples of using subqueries in SELECT, FROM, and WHERE clauses.',
                lecture: 'Lecture 4',
                author_id: enrollments.find((e: any) => e.first_name === 'Lisa')?.user_id,
                link: 'https://drive.google.com/file/d/lisa_subqueries',
            },
            {
                title: 'Indexing Strategies for Performance',
                description: 'Notes on database indexing, B-tree indexes, hash indexes, and when to use each. Covers index creation, maintenance, and performance optimization techniques.',
                lecture: 'Lecture 7',
                author_id: enrollments.find((e: any) => e.first_name === 'Lisa')?.user_id,
                link: 'https://drive.google.com/file/d/lisa_indexing',
            },

            // David Kim notes
            {
                title: 'Relational Algebra Operations',
                description: 'Complete guide to relational algebra including selection, projection, union, intersection, difference, Cartesian product, and join operations. Includes worked examples.',
                lecture: 'Lecture 1',
                author_id: enrollments.find((e: any) => e.first_name === 'David')?.user_id,
                link: 'https://drive.google.com/file/d/david_relational_algebra',
            },
            {
                title: 'ACID Properties Explained',
                description: 'Detailed explanation of ACID properties (Atomicity, Consistency, Isolation, Durability) with real-world examples. Covers how databases ensure data integrity.',
                lecture: 'Lecture 6',
                author_id: enrollments.find((e: any) => e.first_name === 'David')?.user_id,
                link: 'https://drive.google.com/file/d/david_acid',
            },
            {
                title: 'Concurrency Control Mechanisms',
                description: 'Notes on locking protocols, two-phase locking, timestamp ordering, and optimistic concurrency control. Covers deadlock detection and prevention strategies.',
                lecture: 'Lecture 9',
                author_id: enrollments.find((e: any) => e.first_name === 'David')?.user_id,
                link: 'https://drive.google.com/file/d/david_concurrency',
            },
            {
                title: 'Database Backup and Recovery',
                description: 'Comprehensive guide to database backup strategies, recovery techniques, log-based recovery, and checkpoint mechanisms. Includes disaster recovery planning.',
                lecture: 'Lecture 10',
                author_id: enrollments.find((e: any) => e.first_name === 'David')?.user_id,
                link: 'https://drive.google.com/file/d/david_recovery',
            },

            // Ramkrishna Sharma notes
            {
                title: 'SQL DDL and DML Commands',
                description: 'Complete reference for Data Definition Language (CREATE, ALTER, DROP) and Data Manipulation Language (INSERT, UPDATE, DELETE) commands with syntax examples.',
                lecture: 'Lecture 2',
                author_id: enrollments.find((e: any) => e.first_name === 'Ramkrishna')?.user_id,
                link: 'https://drive.google.com/file/d/ram_ddl_dml',
            },
            {
                title: 'Database Design Principles',
                description: 'Best practices for database design including normalization forms (1NF, 2NF, 3NF, BCNF), functional dependencies, and design trade-offs.',
                lecture: 'Lecture 4',
                author_id: enrollments.find((e: any) => e.first_name === 'Ramkrishna')?.user_id,
                link: 'https://drive.google.com/file/d/ram_design',
            },
            {
                title: 'Query Optimization Techniques',
                description: 'Strategies for optimizing SQL queries including query planning, execution plans, and cost-based optimization. Covers index usage and join algorithms.',
                lecture: 'Lecture 8',
                author_id: enrollments.find((e: any) => e.first_name === 'Ramkrishna')?.user_id,
                link: 'https://drive.google.com/file/d/ram_optimization',
            },

            // More notes from existing authors (Alex, Emily, James)
            {
                title: 'SQL Window Functions',
                description: 'Advanced SQL window functions including ROW_NUMBER(), RANK(), DENSE_RANK(), and aggregate window functions. Examples of partitioning and ordering.',
                lecture: 'Lecture 5',
                author_id: enrollments.find((e: any) => e.first_name === 'Alex')?.user_id,
                link: 'https://drive.google.com/file/d/alex_window_functions',
            },
            {
                title: 'Database Security and Authorization',
                description: 'Notes on database security models, access control, SQL injection prevention, encryption, and user authentication mechanisms.',
                lecture: 'Lecture 7',
                author_id: enrollments.find((e: any) => e.first_name === 'Alex')?.user_id,
                link: 'https://drive.google.com/file/d/alex_security',
            },
            {
                title: 'NoSQL Database Overview',
                description: 'Introduction to NoSQL databases including document stores, key-value stores, column families, and graph databases. Comparison with relational databases.',
                lecture: 'Lecture 11',
                author_id: enrollments.find((e: any) => e.first_name === 'Emily')?.user_id,
                link: 'https://drive.google.com/file/d/emily_nosql',
            },
            {
                title: 'Distributed Database Systems',
                description: 'Overview of distributed database architectures, replication strategies, consistency models (CAP theorem), and distributed transaction management.',
                lecture: 'Lecture 12',
                author_id: enrollments.find((e: any) => e.first_name === 'Emily')?.user_id,
                link: 'https://drive.google.com/file/d/emily_distributed',
            },
            {
                title: 'Data Warehousing Concepts',
                description: 'Introduction to data warehousing, OLAP vs OLTP, star schema, snowflake schema, and ETL processes for business intelligence.',
                lecture: 'Lecture 13',
                author_id: enrollments.find((e: any) => e.first_name === 'James')?.user_id,
                link: 'https://drive.google.com/file/d/james_warehouse',
            },
            {
                title: 'Database Tuning and Performance',
                description: 'Practical techniques for database performance tuning including query rewriting, materialized views, partitioning, and hardware considerations.',
                lecture: 'Lecture 14',
                author_id: enrollments.find((e: any) => e.first_name === 'James')?.user_id,
                link: 'https://drive.google.com/file/d/james_tuning',
            },
        ];

        console.log(`Creating ${notes.length} notes...\n`);

        let created = 0;
        let skipped = 0;

        for (const note of notes) {
            if (!note.author_id) {
                console.log(`    Skipping "${note.title}" - author not found`);
                skipped++;
                continue;
            }

            try {
                // Create note with a date spread over the semester
                const daysAgo = Math.floor(Math.random() * 90); // Random date within last 90 days
                const createdAt = new Date();
                createdAt.setDate(createdAt.getDate() - daysAgo);

                await connection.execute(
                    `INSERT INTO notes (course_id, author_id, title, description, lecture, link, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [courseId, note.author_id, note.title, note.description, note.lecture, note.link, createdAt]
                );

                const author = enrollments.find((e: any) => e.user_id === note.author_id);
                console.log(`   Created: "${note.title}" by ${author?.first_name} ${author?.last_name}`);
                created++;
            } catch (error: any) {
                if (error.code === 'ER_DUP_ENTRY') {
                    console.log(`    Skipping "${note.title}" - already exists`);
                    skipped++;
                } else {
                    console.error(`    Error creating "${note.title}":`, error.message);
                    skipped++;
                }
            }
        }

        console.log(`\n Created ${created} notes`);
        if (skipped > 0) {
            console.log(` Skipped ${skipped} notes`);
        }

        // Show summary
        const [summary]: any = await connection.execute(
            `SELECT 
        COUNT(*) as total_notes,
        COUNT(DISTINCT author_id) as unique_authors
       FROM notes
       WHERE course_id = ?`,
            [courseId]
        );

        console.log(`\n Summary for Database Systems:`);
        console.log(`  Total notes: ${summary[0].total_notes}`);
        console.log(`  Unique authors: ${summary[0].unique_authors}`);

    } catch (error: any) {
        console.error('\n Error:', error.message);
        if (error.code) {
            console.error(`Error code: ${error.code}`);
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n Database connection closed.');
        }
    }
}

addNotes()
    .then(() => {
        console.log('\n Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n Failed:', error);
        process.exit(1);
    });

