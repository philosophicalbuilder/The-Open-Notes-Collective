import { NextRequest } from 'next/server';
import { createUser, getUserByComputingId } from '@/lib/auth';
import { apiHandler, apiError, apiResponse } from '@/lib/api-helpers';

// Handles new user registration.
// Validates input, checks for duplicates, and creates user account.
export const POST = apiHandler(async (req: NextRequest) => {
  const { computing_id, email, password, first_name, middle_name, last_name, role, student_type, phone } = await req.json();

  // Validate all required fields are present
  if (!computing_id || !email || !password || !first_name || !last_name || !role) {
    return apiError('Missing required fields', 400);
  }

  // Ensure role is either student or instructor (no other values allowed)
  if (role !== 'student' && role !== 'instructor') {
    return apiError('Invalid role', 400);
  }

  // Check if computing ID already exists to prevent duplicates
  // Using 409 (Conflict) status code for duplicate resource
  if (await getUserByComputingId(computing_id)) {
    return apiError('User already exists', 409);
  }

  // Create user in database
  // Only set student_type if role is student (instructors don't have student_type)
  const userId = await createUser({
    computing_id,
    email,
    password,
    first_name,
    middle_name,
    last_name,
    role,
    student_type: role === 'student' ? student_type : null, // Conditional assignment
    phone,
  });

  // Return 201 (Created) status code for successful resource creation
  return apiResponse({ message: 'User created successfully', user_id: userId }, 201);
});

