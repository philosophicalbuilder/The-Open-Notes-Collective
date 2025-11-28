import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { query } from '../lib/db';

// Validate environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('Missing Google OAuth credentials. Check your .env.local file.');
}

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          if (!user.email) {
            return false;
          }

          // Extract computing ID from email (e.g., abc2def@virginia.edu -> abc2def)
          const emailParts = user.email.split('@');
          const computingId = emailParts[0] || '';
          const domain = emailParts[1] || '';

          // Only allow @virginia.edu emails
          if (domain !== 'virginia.edu') {
            return false;
          }

          // Check if user exists in database
          const results: any = await query(
            'SELECT user_id FROM users WHERE email = ?',
            [user.email]
          );
          const existingUser = results.length > 0 ? results[0] : null;

          if (!existingUser) {
            // Extract name
            const nameParts = user.name?.split(' ') || [];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Insert new user (role will be set during first login flow via callback)
            // Use a placeholder password hash for OAuth users
            await query(
              `INSERT INTO users (computing_id, email, password_hash, first_name, last_name, role, student_type)
               VALUES (?, ?, ?, ?, ?, 'student', NULL)`,
              [computingId, user.email, 'oauth_user_no_password', firstName, lastName]
            );
          }

          return true;
        } catch (error) {
          console.error('Error during sign in:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'google' && user?.email) {
        // Fetch user from database
        const results: any = await query(
          'SELECT user_id, computing_id, role, student_type FROM users WHERE email = ?',
          [user.email]
        );
        const dbUser = results.length > 0 ? results[0] : null;

        if (dbUser) {
          token.userId = dbUser.user_id;
          token.computingId = dbUser.computing_id;
          token.role = dbUser.role;
          token.studentType = dbUser.student_type;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Extend session.user with custom properties from token
        // TypeScript requires explicit assignment due to NextAuth's strict typing
        Object.assign(session.user, {
          id: token.userId as number,
          computingId: token.computingId as string,
          role: token.role as 'student' | 'instructor',
          studentType: token.studentType as 'sdac' | 'non-sdac' | null,
        });
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
} satisfies NextAuthConfig;

