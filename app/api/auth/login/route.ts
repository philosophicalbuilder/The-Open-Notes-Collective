import { NextRequest } from 'next/server';
import { authenticateUser, generateToken } from '@/lib/auth';
import { apiHandler, apiError, apiResponse } from '@/lib/api-helpers';

// Handles user login by validating credentials and setting auth cookie.
// Returns user data on success, error message on failure.
export const POST = apiHandler(async (req: NextRequest) => {
  const { computing_id, password } = await req.json();

  // Validate required fields before proceeding
  if (!computing_id || !password) {
    return apiError('Computing ID and password are required', 400);
  }

  // Step 1: Authenticate user credentials
  const user = await authenticateUser(computing_id, password);
  if (!user) return apiError('Invalid credentials', 401); // Check for invalid login

  // Step 2: Generate JWT token for session management
  const token = generateToken(user);

  // Step 3: Create response with user data (excluding sensitive info like password)
  const res = apiResponse({
    message: 'Login successful',
    user: {
      user_id: user.user_id,
      computing_id: user.computing_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      student_type: user.student_type,
    },
  });

  // Step 4: Set HTTP-only cookie to prevent XSS attacks
  // Using httpOnly so JavaScript can't access it
  // Secure flag only in production (HTTPS required)
  // maxAge set to 7 days (60 seconds * 60 minutes * 24 hours * 7 days)
  res.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production
    sameSite: 'lax', // Prevents CSRF attacks
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  });

  return res;
});

