# Database Privileges Implementation

## Overview
The application now uses two separate MySQL database users with different privilege levels:
- **app_user**: For authenticated users (SELECT, INSERT, UPDATE)
- **readonly_user**: For guests (SELECT only)

## SQL Commands Executed
See `scripts/database-privileges.sql` for the exact SQL commands that were run.

## Implementation Details

### 1. Database Connection (`lib/db.ts`)
- Two separate connection pools:
  - `appPool`: Uses `app_user` credentials
  - `readonlyPool`: Uses `readonly_user` credentials
- `query()` and `queryOne()` functions accept `isGuest` parameter
- Default behavior: `isGuest = false` (uses app_user)

### 2. Guest Detection (`lib/api-helpers.ts`)
- `isGuest(req)` function detects if request has no valid auth token
- Returns `true` for unauthenticated requests

### 3. API Routes Using Guest Mode

**Read Operations (use readonly_user for guests):**
- `GET /api/notes` - View notes
- `GET /api/courses` - View courses  
- `GET /api/note-requests` - View note requests

**Write Operations (always use app_user, require auth):**
- `POST /api/notes` - Submit notes
- `POST /api/courses` - Create courses
- `POST /api/note-requests` - Create requests
- `POST /api/ratings` - Rate notes
- `POST /api/enrollments` - Enroll in courses
- All DELETE operations
- All UPDATE operations

### 4. Environment Variables Required

```bash
# For app_user (authenticated users)
DB_APP_USER=app_user
DB_APP_PASSWORD=secure_pw

# For readonly_user (guests)
DB_READONLY_USER=readonly_user
DB_READONLY_PASSWORD=secure_readonly_pw

# Fallback (if DB_APP_USER not set, uses DB_USER)
DB_USER=app_user
DB_PASSWORD=secure_pw
```

## How It Works

1. **Guest Request Flow:**
   - Guest visits dashboard → No auth token
   - `isGuest(req)` returns `true`
   - API routes call `query(sql, params, true)`
   - Database connection uses `readonly_user`
   - Database enforces SELECT-only privileges

2. **Authenticated Request Flow:**
   - User logs in → Auth token set
   - `isGuest(req)` returns `false`
   - API routes call `query(sql, params, false)` or omit parameter
   - Database connection uses `app_user`
   - Database allows SELECT, INSERT, UPDATE

## Security Benefits

1. **Database-Level Enforcement**: Even if application code has bugs, database prevents unauthorized writes
2. **Principle of Least Privilege**: Each user type gets minimum permissions needed
3. **Defense in Depth**: Multiple layers of security (app-level + database-level)

## Verification

To verify the implementation is working:
1. Check database logs to see which user is connecting
2. Try to INSERT/UPDATE as readonly_user → Should fail with permission error
3. Check that guests can only read data, not modify it

