# Open Notes Collective

A platform for students to share and access course notes.

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Database

#### Option A: Local MySQL
1. Install MySQL on your machine
2. Create database: `CREATE DATABASE open_notes_collective;`
3. Run schema: `mysql -u root -p open_notes_collective < database-schema.sql`

#### Option B: Cloud MySQL (Recommended)
- **PlanetScale** (Free tier): https://planetscale.com
- **Railway**: https://railway.app (Easy setup)
- **AWS RDS**: https://aws.amazon.com/rds/

### 3. Configure Environment Variables

Create a `.env.local` file:

```env
# Database
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=open_notes_collective

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here
# Use: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure consent screen if needed
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret

For more detailed OAuth setup, see the OAuth Setup section below.

### 5. Run Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

## Database Schema

The database includes 12 normalized tables:

1. **users** - User accounts (students and instructors)
2. **semesters** - Academic semesters
3. **courses** - Courses published by instructors
4. **enrollments** - Student course enrollments
5. **notes** - Notes submitted by students
6. **ratings** - Ratings for notes
7. **note_requests** - Live notes requests
8. **note_views** - Analytics for note views
9. **user_sessions** - Authentication sessions
10. **course_materials** - Additional course materials
11. **activity_logs** - Audit trail

## API Routes

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course (instructor only)
- `GET /api/notes` - List notes (with search/filter)
- `POST /api/notes` - Submit note
- `POST /api/enrollments` - Enroll in course
- `GET /api/export/notes` - Export notes as JSON/CSV

## OAuth Setup (Detailed)

### Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select Project**
   - Click "Select a project" → "New Project"
   - Name it (e.g., "Open Notes Collective")
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" or "People API"
   - Click "Enable"

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (unless you have Google Workspace)
   - Fill in:
     - App name: "Open Notes Collective"
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Add scopes: `email`, `profile`
   - Add test users (your email) if in testing mode
   - Click "Save and Continue"

5. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Open Notes Collective Web Client"
   - **Authorized redirect URIs:**
     - Development: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://your-domain.com/api/auth/callback/google`
   - Click "Create"
   - **Copy the Client ID and Client Secret**

### Troubleshooting

- **"Redirect URI mismatch"**: Make sure the redirect URI in Google Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- **"Access blocked"**: If in testing mode, make sure your email is added as a test user
- **"User not created"**: Check database connection and verify email domain is @virginia.edu

## Security

### Database Level
- Separate users with limited privileges
- GRANT/REVOKE statements for access control
- Foreign key constraints for data integrity

### Application Level
- Password hashing with bcrypt
- JWT-based session management
- Role-based access control (student vs instructor)
- SQL injection prevention (parameterized queries)

## Project Requirements

This project meets all database systems course requirements:

✅ **10+ Normalized Tables** - 12 tables in the schema
✅ **CRUD Operations** - All through the application
✅ **Search/Filter** - Implemented for notes and courses
✅ **Export Functionality** - JSON/CSV export available
✅ **Multi-user Support** - Concurrent access supported
✅ **Returning Users** - Session management and persistent data
✅ **Database Security** - GRANT/REVOKE privileges configured
✅ **Application Security** - Authentication, password hashing, role-based access

