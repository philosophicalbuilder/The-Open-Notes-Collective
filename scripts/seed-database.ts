import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';
import bcrypt from 'bcryptjs';

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

async function seedDatabase() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!\n');

    // Helper function to hash passwords
    const hashPassword = async (password: string): Promise<string> => {
      return await bcrypt.hash(password, 10);
    };

    // 1. Create or get current semester
    console.log('Setting up semester...');
    const [semesterResult]: any = await connection.execute(
      `INSERT INTO semesters (name, start_date, end_date, is_current)
       VALUES ('Fall 2025', '2025-08-25', '2025-12-15', TRUE)
       ON DUPLICATE KEY UPDATE is_current = TRUE`
    );

    let semesterId: number;
    if (semesterResult.insertId) {
      semesterId = semesterResult.insertId;
    } else {
      const [semester]: any = await connection.execute(
        "SELECT semester_id FROM semesters WHERE name = 'Fall 2025'"
      );
      semesterId = semester[0].semester_id;
    }
    console.log(`Semester ID: ${semesterId}\n`);

    // 2. Create instructors
    console.log('Creating instructors...');
    const instructors = [
      {
        computing_id: 'prof_smith',
        email: 'prof.smith@virginia.edu',
        password: 'password123',
        first_name: 'Dr. Sarah',
        last_name: 'Smith',
        phone: '+1 (434) 555-0101',
      },
      {
        computing_id: 'prof_jones',
        email: 'prof.jones@virginia.edu',
        password: 'password123',
        first_name: 'Dr. Michael',
        last_name: 'Jones',
        phone: '+1 (434) 555-0102',
      },
    ];

    const instructorIds: number[] = [];
    for (const instructor of instructors) {
      const passwordHash = await hashPassword(instructor.password);
      try {
        const [result]: any = await connection.execute(
          `INSERT INTO users (computing_id, email, password_hash, first_name, last_name, role, phone)
           VALUES (?, ?, ?, ?, ?, 'instructor', ?)`,
          [instructor.computing_id, instructor.email, passwordHash, instructor.first_name, instructor.last_name, instructor.phone]
        );
        instructorIds.push(result.insertId);
        console.log(`   Created instructor: ${instructor.first_name} ${instructor.last_name} (ID: ${result.insertId})`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
          const [existing]: any = await connection.execute(
            'SELECT user_id FROM users WHERE computing_id = ?',
            [instructor.computing_id]
          );
          instructorIds.push(existing[0].user_id);
          console.log(`    Instructor already exists: ${instructor.first_name} ${instructor.last_name}`);
        } else {
          throw error;
        }
      }
    }
    console.log('');

    // 3. Create students
    console.log('Creating students...');
    const students = [
      {
        computing_id: 'abc2def',
        email: 'abc2def@virginia.edu',
        password: 'password123',
        first_name: 'Alex',
        middle_name: 'Jordan',
        last_name: 'Smith',
        student_type: 'sdac',
        phone: '+1 (434) 555-0201',
      },
      {
        computing_id: 'xyz9abc',
        email: 'xyz9abc@virginia.edu',
        password: 'password123',
        first_name: 'Emily',
        last_name: 'Chen',
        student_type: 'non-sdac',
        phone: '+1 (434) 555-0202',
      },
      {
        computing_id: 'mno3pqr',
        email: 'mno3pqr@virginia.edu',
        password: 'password123',
        first_name: 'James',
        last_name: 'Park',
        student_type: 'non-sdac',
      },
      {
        computing_id: 'stu4vwx',
        email: 'stu4vwx@virginia.edu',
        password: 'password123',
        first_name: 'Lisa',
        last_name: 'Wang',
        student_type: 'sdac',
      },
      {
        computing_id: 'def5ghi',
        email: 'def5ghi@virginia.edu',
        password: 'password123',
        first_name: 'David',
        last_name: 'Kim',
        student_type: 'non-sdac',
      },
      {
        computing_id: 'jkl6mno',
        email: 'jkl6mno@virginia.edu',
        password: 'password123',
        first_name: 'Sophia',
        last_name: 'Rodriguez',
        student_type: 'non-sdac',
      },
      {
        computing_id: 'pqr7stu',
        email: 'pqr7stu@virginia.edu',
        password: 'password123',
        first_name: 'Ryan',
        last_name: 'Johnson',
        student_type: 'sdac',
      },
      {
        computing_id: 'vwx8yza',
        email: 'vwx8yza@virginia.edu',
        password: 'password123',
        first_name: 'Maya',
        last_name: 'Patel',
        student_type: 'non-sdac',
      },
    ];

    const studentIds: number[] = [];
    for (const student of students) {
      const passwordHash = await hashPassword(student.password);
      try {
        const [result]: any = await connection.execute(
          `INSERT INTO users (computing_id, email, password_hash, first_name, middle_name, last_name, role, student_type, phone)
           VALUES (?, ?, ?, ?, ?, ?, 'student', ?, ?)`,
          [
            student.computing_id,
            student.email,
            passwordHash,
            student.first_name,
            student.middle_name || null,
            student.last_name,
            student.student_type,
            student.phone || null,
          ]
        );
        studentIds.push(result.insertId);
        console.log(`   Created student: ${student.first_name} ${student.last_name} (ID: ${result.insertId})`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
          const [existing]: any = await connection.execute(
            'SELECT user_id FROM users WHERE computing_id = ?',
            [student.computing_id]
          );
          studentIds.push(existing[0].user_id);
          console.log(`    Student already exists: ${student.first_name} ${student.last_name}`);
        } else {
          throw error;
        }
      }
    }
    console.log('');

    // 4. Create courses
    console.log('Creating courses...');
    const courses = [
      {
        name: 'Database Systems',
        code: 'CS 4750',
        section_id: '00114',
        description: 'Introduction to database systems, SQL, normalization, and transaction management.',
        instructor_id: instructorIds[0],
      },
      {
        name: 'Software Development Methods',
        code: 'CS 3240',
        section_id: '0998',
        description: 'Software engineering principles, agile development, testing, and project management.',
        instructor_id: instructorIds[0],
      },
      {
        name: 'Human Computer Interaction',
        code: 'CS 3240',
        section_id: '02342',
        description: 'Design principles for user interfaces, usability testing, and interaction design.',
        instructor_id: instructorIds[1],
      },
    ];

    const courseIds: number[] = [];
    for (const course of courses) {
      try {
        const [result]: any = await connection.execute(
          `INSERT INTO courses (name, code, section_id, description, instructor_id, semester_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [course.name, course.code, course.section_id, course.description, course.instructor_id, semesterId]
        );
        courseIds.push(result.insertId);
        console.log(`   Created course: ${course.name} [${course.code}] (ID: ${result.insertId})`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEY') {
          const [existing]: any = await connection.execute(
            'SELECT course_id FROM courses WHERE code = ? AND section_id = ? AND semester_id = ?',
            [course.code, course.section_id, semesterId]
          );
          courseIds.push(existing[0].course_id);
          console.log(`    Course already exists: ${course.name}`);
        } else {
          throw error;
        }
      }
    }
    console.log('');

    // 5. Enroll students in courses
    console.log('Enrolling students in courses...');
    const enrollments = [
      // Database Systems enrollments
      { student_id: studentIds[0], course_id: courseIds[0] },
      { student_id: studentIds[1], course_id: courseIds[0] },
      { student_id: studentIds[2], course_id: courseIds[0] },
      { student_id: studentIds[3], course_id: courseIds[0] },
      { student_id: studentIds[4], course_id: courseIds[0] },
      // Software Development enrollments
      { student_id: studentIds[0], course_id: courseIds[1] },
      { student_id: studentIds[1], course_id: courseIds[1] },
      { student_id: studentIds[2], course_id: courseIds[1] },
      { student_id: studentIds[5], course_id: courseIds[1] },
      { student_id: studentIds[6], course_id: courseIds[1] },
      // HCI enrollments
      { student_id: studentIds[3], course_id: courseIds[2] },
      { student_id: studentIds[4], course_id: courseIds[2] },
      { student_id: studentIds[5], course_id: courseIds[2] },
      { student_id: studentIds[6], course_id: courseIds[2] },
      { student_id: studentIds[7], course_id: courseIds[2] },
    ];

    let enrollmentCount = 0;
    for (const enrollment of enrollments) {
      try {
        await connection.execute(
          'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
          [enrollment.student_id, enrollment.course_id]
        );
        enrollmentCount++;
      } catch (error: any) {
        if (error.code !== 'ER_DUP_ENTRY') {
          console.error(`     Error enrolling student ${enrollment.student_id} in course ${enrollment.course_id}:`, error.message);
        }
      }
    }
    console.log(`   Created ${enrollmentCount} enrollments\n`);

    // 6. Create notes
    console.log('Creating notes...');
    const notes = [
      {
        title: 'SQL Joins and Aggregations',
        description: 'Comprehensive notes covering INNER JOIN, LEFT JOIN, RIGHT JOIN, and common aggregate functions like COUNT, SUM, AVG. Includes practical examples and common pitfalls to avoid.',
        lecture: 'Lecture 3',
        link: 'https://drive.google.com/file/d/example1',
        course_id: courseIds[0],
        author_id: studentIds[0],
      },
      {
        title: 'Database Normalization Guide',
        description: 'Step-by-step guide through 1NF, 2NF, 3NF, and BCNF with real-world examples. Explains functional dependencies and how to identify normalization opportunities.',
        lecture: 'Lecture 5',
        link: 'https://www.dropbox.com/s/example2',
        course_id: courseIds[0],
        author_id: studentIds[1],
      },
      {
        title: 'Transaction Management Notes',
        description: 'Detailed explanation of transaction properties, isolation levels, and deadlock prevention strategies. Includes diagrams and pseudocode examples.',
        lecture: 'Lecture 8',
        link: 'https://drive.google.com/file/d/example3',
        course_id: courseIds[0],
        author_id: studentIds[2],
      },
      {
        title: 'Agile Development Principles',
        description: 'Overview of Scrum, Kanban, and other agile methodologies. Includes sprint planning, daily standups, and retrospective practices.',
        lecture: 'Lecture 2',
        link: 'https://onedrive.live.com/example4',
        course_id: courseIds[1],
        author_id: studentIds[0],
      },
      {
        title: 'Unit Testing Best Practices',
        description: 'Guide to writing effective unit tests, test-driven development, mocking, and code coverage. Includes examples in multiple languages.',
        lecture: 'Lecture 6',
        link: 'https://drive.google.com/file/d/example5',
        course_id: courseIds[1],
        author_id: studentIds[1],
      },
      {
        title: 'UI/UX Design Principles',
        description: 'Fundamental principles of user interface design, including color theory, typography, spacing, and accessibility guidelines.',
        lecture: 'Lecture 4',
        link: 'https://www.dropbox.com/s/example6',
        course_id: courseIds[2],
        author_id: studentIds[3],
      },
      {
        title: 'Usability Testing Methods',
        description: 'How to conduct effective usability tests, analyze results, and iterate on designs based on user feedback.',
        lecture: 'Lecture 7',
        link: 'https://drive.google.com/file/d/example7',
        course_id: courseIds[2],
        author_id: studentIds[4],
      },
    ];

    const noteIds: number[] = [];
    for (const note of notes) {
      try {
        const [result]: any = await connection.execute(
          `INSERT INTO notes (title, description, lecture, link, course_id, author_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [note.title, note.description, note.lecture, note.link, note.course_id, note.author_id]
        );
        noteIds.push(result.insertId);
        console.log(`   Created note: "${note.title}" (ID: ${result.insertId})`);
      } catch (error: any) {
        console.error(`     Error creating note "${note.title}":`, error.message);
      }
    }
    console.log('');

    // 7. Add ratings
    console.log('Adding ratings...');
    const ratings = [
      { note_id: noteIds[0], user_id: studentIds[1], rating: 4.5 },
      { note_id: noteIds[0], user_id: studentIds[2], rating: 4.8 },
      { note_id: noteIds[0], user_id: studentIds[3], rating: 4.2 },
      { note_id: noteIds[1], user_id: studentIds[0], rating: 4.7 },
      { note_id: noteIds[1], user_id: studentIds[2], rating: 4.9 },
      { note_id: noteIds[2], user_id: studentIds[0], rating: 4.3 },
      { note_id: noteIds[2], user_id: studentIds[1], rating: 4.6 },
      { note_id: noteIds[3], user_id: studentIds[1], rating: 4.4 },
      { note_id: noteIds[3], user_id: studentIds[2], rating: 4.5 },
      { note_id: noteIds[4], user_id: studentIds[0], rating: 4.8 },
      { note_id: noteIds[4], user_id: studentIds[2], rating: 4.7 },
      { note_id: noteIds[5], user_id: studentIds[4], rating: 4.6 },
      { note_id: noteIds[5], user_id: studentIds[5], rating: 4.5 },
      { note_id: noteIds[6], user_id: studentIds[3], rating: 4.7 },
      { note_id: noteIds[6], user_id: studentIds[5], rating: 4.4 },
    ];

    let ratingCount = 0;
    for (const rating of ratings) {
      try {
        await connection.execute(
          'INSERT INTO ratings (note_id, user_id, rating) VALUES (?, ?, ?)',
          [rating.note_id, rating.user_id, rating.rating]
        );
        ratingCount++;
      } catch (error: any) {
        if (error.code !== 'ER_DUP_ENTRY') {
          console.error(`     Error adding rating:`, error.message);
        }
      }
    }
    console.log(`   Created ${ratingCount} ratings\n`);

    console.log('Database seeding completed successfully!');
    console.log('\n Summary:');
    console.log(`  - ${instructorIds.length} instructors`);
    console.log(`  - ${studentIds.length} students`);
    console.log(`  - ${courseIds.length} courses`);
    console.log(`  - ${enrollmentCount} enrollments`);
    console.log(`  - ${noteIds.length} notes`);
    console.log(`  - ${ratingCount} ratings`);
    console.log('\n Test credentials (all passwords: "password123"):');
    console.log(' Instructors:');
    instructors.forEach((inst, i) => {
      console.log(`    - ${inst.computing_id}@virginia.edu (${inst.first_name} ${inst.last_name})`);
    });
    console.log(' Students:');
    students.slice(0, 3).forEach((stu) => {
      console.log(`    - ${stu.computing_id}@virginia.edu (${stu.first_name} ${stu.last_name})`);
    });
    console.log('');

  } catch (error: any) {
    console.error('\n Seeding failed:');
    console.error(error.message);
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

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n Seeding failed:', error);
    process.exit(1);
  });

