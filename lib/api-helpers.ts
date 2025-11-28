import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

// Helper functions for API route authentication and response handling.
// Created these to avoid repeating the same auth checks in every route.

// Returns the authenticated user from the request cookie, or null if not authenticated.
// Precondition: req contains a valid auth-token cookie
// Postcondition: returns user object if token is valid, null otherwise
export function getAuthUser(req: NextRequest) {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return null; // Check for empty token to avoid errors
    return verifyToken(token);
}

// Requires authentication and optionally checks for specific role.
// Throws an error object that can be caught by apiHandler if auth fails.
// Using throw here because it's cleaner than returning error responses manually.
export function requireAuth(req: NextRequest, role?: 'student' | 'instructor') {
    const user = getAuthUser(req);
    if (!user) {
        throw { status: 401, error: 'Unauthorized' }; // Special case: no token provided
    }
    if (role && user.role !== role) {
        throw { status: 403, error: `Forbidden - ${role} access required` }; // Role mismatch
    }
    return user;
}

// Helper to create a successful API response with JSON data.
// Default status is 200, but can be overridden for created resources (201), etc.
export function apiResponse(data: any, status = 200) {
    return NextResponse.json(data, { status });
}

// Helper to create an error response.
// Default status is 500, but should be set appropriately (400, 401, 404, etc.)
export function apiError(message: string, status = 500) {
    return NextResponse.json({ error: message }, { status });
}

// Wrapper function that handles errors for all API route handlers.
// This way we don't have to write try-catch in every single route.
// Catches errors and converts them to proper HTTP error responses.
export function apiHandler(handler: (req: NextRequest) => Promise<any>) {
    return async (req: NextRequest) => {
        try {
            return await handler(req);
        } catch (error: any) {
            console.error('API Error:', error);
            // Check if error has status and error fields (from requireAuth)
            if (error.status && error.error) {
                return apiError(error.error, error.status);
            }
            // Fallback for unexpected errors
            return apiError('Something went wrong', 500);
        }
    };
}

