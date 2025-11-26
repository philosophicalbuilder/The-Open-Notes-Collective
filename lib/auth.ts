import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db';

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

// hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// check password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// make jwt token
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

// check jwt token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// get user by computing id
export async function getUserByComputingId(computingId: string): Promise<any> {
  const results = await query<any[]>(
    'SELECT user_id, computing_id, email, first_name, last_name, role, student_type FROM users WHERE computing_id = ?',
    [computingId]
  );
  return results.length > 0 ? results[0] : null;
}

// get user by id
export async function getUserById(userId: number): Promise<any> {
  const results = await query<any[]>(
    'SELECT user_id, computing_id, email, first_name, last_name, role, student_type FROM users WHERE user_id = ?',
    [userId]
  );
  return results.length > 0 ? results[0] : null;
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

// check if user login is valid
export async function authenticateUser(computingId: string, password: string): Promise<any> {
  const results = await query<any[]>(
    'SELECT user_id, computing_id, email, password_hash, first_name, last_name, role, student_type FROM users WHERE computing_id = ?',
    [computingId]
  );

  if (results.length === 0) return null;
  const user = results[0];

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

