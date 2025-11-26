import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from './db';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production';

export interface User {
  user_id: number;
  computing_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'instructor';
  student_type?: 'sdac' | 'non-sdac' | null;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.user_id,
      computingId: user.computing_id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Get user by computing ID
export async function getUserByComputingId(computingId: string): Promise<User | null> {
  const user = await queryOne<{
    user_id: number;
    computing_id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'student' | 'instructor';
    student_type: 'sdac' | 'non-sdac' | null;
  }>(
    'SELECT user_id, computing_id, email, first_name, last_name, role, student_type FROM users WHERE computing_id = ?',
    [computingId]
  );
  return user as User | null;
}

// Get user by ID
export async function getUserById(userId: number): Promise<User | null> {
  const user = await queryOne<{
    user_id: number;
    computing_id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'student' | 'instructor';
    student_type: 'sdac' | 'non-sdac' | null;
  }>(
    'SELECT user_id, computing_id, email, first_name, last_name, role, student_type FROM users WHERE user_id = ?',
    [userId]
  );
  return user as User | null;
}

// Create user
export async function createUser(data: {
  computing_id: string;
  email: string;
  password: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  role: 'student' | 'instructor';
  student_type?: 'sdac' | 'non-sdac' | null;
  phone?: string;
}): Promise<number> {
  const passwordHash = await hashPassword(data.password);
  const result = await query<{ insertId: number }>(
    `INSERT INTO users (computing_id, email, password_hash, first_name, middle_name, last_name, role, student_type, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.computing_id,
      data.email,
      passwordHash,
      data.first_name,
      data.middle_name || null,
      data.last_name,
      data.role,
      data.student_type || null,
      data.phone || null,
    ]
  );
  return result.insertId;
}

// Authenticate user
export async function authenticateUser(computingId: string, password: string): Promise<User | null> {
  const user = await queryOne<{
    user_id: number;
    computing_id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: 'student' | 'instructor';
    student_type: 'sdac' | 'non-sdac' | null;
  }>(
    'SELECT user_id, computing_id, email, password_hash, first_name, last_name, role, student_type FROM users WHERE computing_id = ?',
    [computingId]
  );

  if (!user) return null;

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;

  return {
    user_id: user.user_id,
    computing_id: user.computing_id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    student_type: user.student_type,
  };
}

