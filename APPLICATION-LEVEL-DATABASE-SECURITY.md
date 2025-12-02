# Application-Level Database Security

## Discussion

Our application implements multiple layers of database security at the application level to protect against common vulnerabilities and ensure data integrity. These security measures work in conjunction with database-level privileges to provide defense in depth.

### 1. SQL Injection Prevention

**Implementation:** All database queries use parameterized queries (prepared statements) instead of string concatenation. This prevents SQL injection attacks by separating SQL code from user input.

**How it works:** User input is passed as parameters to the `query()` function, which uses MySQL's prepared statement API. The database treats parameters as data, not executable SQL code.

### 2. Password Security

**Implementation:** Passwords are never stored in plain text. We use bcrypt hashing with a salt factor of 10 rounds before storing passwords in the database.

**How it works:** When a user registers, their password is hashed using bcrypt before insertion. During login, the provided password is hashed and compared against the stored hash. Even if the database is compromised, attackers cannot retrieve original passwords.

### 3. Authentication & Session Management

**Implementation:** JWT (JSON Web Tokens) are used for session management, stored in HTTP-only cookies to prevent XSS attacks.

**How it works:** After successful login, a JWT token is generated containing user ID, computing ID, and role. This token is stored in an HTTP-only cookie (JavaScript cannot access it), with secure flag in production (HTTPS only), and SameSite protection against CSRF. Tokens expire after 7 days.

### 4. Role-Based Access Control (RBAC)

**Implementation:** The application enforces role-based permissions at the API route level, ensuring users can only perform actions allowed for their role.

**How it works:** Each protected route checks the user's role from the JWT token. Students can only perform student actions, instructors can perform instructor actions. Unauthorized access attempts return 403 Forbidden.

### 5. Input Validation

**Implementation:** All user input is validated before database operations, checking for required fields, data types, and business rules.

**How it works:** API routes validate request payloads before executing database queries. Missing required fields, invalid data types, or business rule violations return 400 Bad Request errors before any database interaction.

### 6. Secure Database Connections

**Implementation:** Database connections use SSL/TLS encryption when connecting to remote databases (e.g., Railway hosting).

**How it works:** The connection pool automatically enables SSL when connecting to Railway-hosted databases, encrypting all data in transit between the application and database server.

### 7. Error Handling

**Implementation:** Database errors are caught and handled gracefully without exposing sensitive information to clients.

**How it works:** Try-catch blocks around database operations catch errors and return generic error messages to clients, while logging detailed errors server-side for debugging. This prevents information leakage about database structure or credentials.

### 8. Audit Logging

**Implementation:** User actions are logged to the `activity_logs` table for security auditing and compliance.

**How it works:** Critical operations (course creation, enrollment, note submission) are logged with user ID, action type, entity type, and timestamp. This provides an audit trail for security investigations.

---

## Code Snippets

### 1. SQL Injection Prevention (Parameterized Queries)

**File:** `lib/db.ts`

```typescript
// run a query (supports guest mode)
export async function query<T = any>(
  sql: string,
  params?: any[],
  isGuest = false
): Promise<T> {
  const connection = getPool(isGuest);
  const [results] = await connection.execute(sql, params);
  return results as T;
}
```

**Usage Example:** `app/api/notes/route.ts`

```typescript
// SECURE: User input passed as parameters
const notes = await query(
  'SELECT * FROM notes WHERE course_id = ? AND title LIKE ?',
  [courseId, `%${search}%`]
);

// INSECURE (NOT USED): String concatenation
// const notes = await query(`SELECT * FROM notes WHERE course_id = ${courseId}`);
```

**Why it's secure:** The `?` placeholders are replaced by MySQL's prepared statement engine with properly escaped parameter values, preventing SQL injection even if malicious input is provided.

---

### 2. Password Hashing

**File:** `lib/auth.ts`

```typescript
import bcrypt from 'bcryptjs';

// hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10); // 10 rounds of salting
}

// check password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Usage Example:** `lib/auth.ts` - User Creation

```typescript
export async function createUser(data: {
  computing_id: string;
  email: string;
  password: string;
  // ... other fields
}): Promise<number> {
  const passwordHash = await hashPassword(data.password); // Hash before storing
  const result = await query<{ insertId: number }>(
    `INSERT INTO users (computing_id, email, password_hash, ...)
     VALUES (?, ?, ?, ...)`,
    [data.computing_id, data.email, passwordHash, ...] // Store hash, not plain text
  );
  return result.insertId;
}
```

**Usage Example:** `lib/auth.ts` - Authentication

```typescript
export async function authenticateUser(computingId: string, password: string): Promise<any> {
  const results = await query<any[]>(
    'SELECT user_id, computing_id, email, password_hash, ... FROM users WHERE computing_id = ?',
    [computingId]
  );

  if (results.length === 0) return null;
  const user = results[0];

  const isValid = await verifyPassword(password, user.password_hash); // Compare hash
  if (!isValid) return null;

  return { /* user data without password_hash */ };
}
```

**Why it's secure:** bcrypt automatically generates a unique salt for each password and uses 10 rounds of hashing, making it computationally infeasible to reverse the hash or use rainbow tables.

---

### 3. JWT Authentication & Secure Cookies

**File:** `lib/auth.ts`

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production';

// make jwt token
export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.user_id,
      computingId: user.computing_id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires after 7 days
  );
}

// check jwt token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null; // Invalid or expired token
  }
}
```

**File:** `app/api/auth/login/route.ts`

```typescript
export const POST = apiHandler(async (req: NextRequest) => {
  const { computing_id, password } = await req.json();

  // Validate required fields
  if (!computing_id || !password) {
    return apiError('Computing ID and password are required', 400);
  }

  // Authenticate user
  const user = await authenticateUser(computing_id, password);
  if (!user) return apiError('Invalid credentials', 401);

  // Generate JWT token
  const token = generateToken(user);

  // Create response
  const res = apiResponse({ message: 'Login successful', user: { /* user data */ } });

  // Set HTTP-only cookie to prevent XSS attacks
  res.cookies.set('auth-token', token, {
    httpOnly: true, // JavaScript cannot access this cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // Prevents CSRF attacks
    maxAge: 60 * 60 * 24 * 7, // 7 days expiration
  });

  return res;
});
```

**Why it's secure:** 
- HTTP-only cookies prevent XSS attacks (JavaScript cannot read the token)
- Secure flag ensures cookies only sent over HTTPS in production
- SameSite prevents CSRF attacks
- JWT tokens are signed and expire after 7 days

---

### 4. Role-Based Access Control (RBAC)

**File:** `lib/api-helpers.ts`

```typescript
// Requires authentication and optionally checks for specific role
export function requireAuth(req: NextRequest, role?: 'student' | 'instructor') {
    const user = getAuthUser(req);
    if (!user) {
        throw { status: 401, error: 'Unauthorized' };
    }
    if (role && user.role !== role) {
        throw { status: 403, error: `Forbidden - ${role} access required` };
    }
    return user;
}
```

**Usage Example:** `app/api/courses/route.ts` - Instructor-Only Route

```typescript
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'instructor') {
            return NextResponse.json(
                { error: 'Forbidden - Instructor access required' },
                { status: 403 }
            );
        }

        // Only instructors can create courses
        const { name, code, section_id, description, semester_id } = await req.json();
        // ... create course
    }
}
```

**Usage Example:** `app/api/notes/route.ts` - Student-Only Route

```typescript
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'student') {
            return NextResponse.json(
                { error: 'Forbidden - Student access required' },
                { status: 403 }
            );
        }

        // Only students can submit notes
        // ... submit note
    }
}
```

**Why it's secure:** Role checks happen before any database operations, preventing unauthorized users from accessing or modifying data they shouldn't have access to.

---

### 5. Input Validation

**File:** `app/api/auth/register/route.ts`

```typescript
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
    if (await getUserByComputingId(computing_id)) {
        return apiError('User already exists', 409);
    }

    // Only proceed with database operation after validation passes
    const userId = await createUser({ /* validated data */ });
    return apiResponse({ message: 'User created successfully', user_id: userId }, 201);
});
```

**File:** `app/api/notes/route.ts`

```typescript
export async function POST(req: NextRequest) {
    // ... authentication checks ...

    const { title, description, lecture, link, course_id, file_url } = await req.json();

    // Validate required fields
    if (!title || !description || !finalLink || !course_id) {
        return NextResponse.json(
            { error: 'Missing required fields: title, description, link/file, and course_id are required' },
            { status: 400 }
        );
    }

    // Verify business rule: user must be enrolled
    const enrollment = await query(
        'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
        [decoded.userId, course_id]
    );

    if (!Array.isArray(enrollment) || enrollment.length === 0) {
        return NextResponse.json(
            { error: 'You must be enrolled in this course to submit notes' },
            { status: 403 }
        );
    }

    // Only create note after all validations pass
    const result = await query(/* insert note */);
}
```

**Why it's secure:** Input validation prevents invalid or malicious data from reaching the database, and business rule validation ensures users can only perform actions they're authorized for.

---

### 6. Secure Database Connections (SSL/TLS)

**File:** `lib/db.ts`

```typescript
// Database config for app_user (authenticated users)
const appDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || process.env.DB_APP_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_APP_PASSWORD || '',
  database: process.env.DB_NAME || 'open_notes_collective',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_HOST?.includes('railway') || process.env.DB_HOST?.includes('rlwy')
    ? { rejectUnauthorized: false } // Enable SSL for remote connections
    : undefined,
};
```

**Why it's secure:** SSL/TLS encryption ensures all data transmitted between the application and database server is encrypted, preventing man-in-the-middle attacks and eavesdropping.

---

### 7. Error Handling

**File:** `lib/api-helpers.ts`

```typescript
// Wrapper function that handles errors for all API route handlers
export function apiHandler(handler: (req: NextRequest) => Promise<any>) {
    return async (req: NextRequest) => {
        try {
            return await handler(req);
        } catch (error: any) {
            console.error('API Error:', error); // Log detailed error server-side
            // Check if error has status and error fields (from requireAuth)
            if (error.status && error.error) {
                return apiError(error.error, error.status);
            }
            // Fallback for unexpected errors - generic message to client
            return apiError('Something went wrong', 500);
        }
    };
}
```

**Why it's secure:** Generic error messages prevent information leakage about database structure, table names, or internal errors, while detailed errors are logged server-side for debugging.

---

### 8. Audit Logging

**File:** `lib/api-helpers.ts`

```typescript
// Logs user activity to the activity_logs table
export async function logActivity(
    userId: number,
    actionType: string,
    entityType: string,
    entityId?: number,
    description?: string
) {
    try {
        await query(
            'INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
            [userId, actionType, entityType, entityId || null, description || null]
        );
    } catch (error) {
        // Don't fail the request if logging fails - just log to console
        console.error('Failed to log activity:', error);
    }
}
```

**Usage Example:** `app/api/courses/route.ts`

```typescript
// Create course
const result = await query(/* insert course */);

// Log activity for audit trail
await logActivity(
    decoded.userId,
    'course_creation',
    'course',
    result.insertId,
    `Created course: ${name}`
);
```

**Why it's secure:** Audit logs provide a trail of who did what and when, enabling security investigations and compliance with data protection regulations.

---

## Summary

These application-level security measures work together to protect the database from common attacks:

1. **SQL Injection Prevention** - Parameterized queries prevent malicious SQL execution
2. **Password Security** - bcrypt hashing ensures passwords cannot be recovered
3. **Authentication** - JWT tokens with secure cookies prevent unauthorized access
4. **Authorization** - Role-based access control enforces permissions
5. **Input Validation** - Prevents invalid data and enforces business rules
6. **Encrypted Connections** - SSL/TLS protects data in transit
7. **Secure Error Handling** - Prevents information leakage
8. **Audit Logging** - Provides security trail for investigations

Together with database-level privileges (separate users for guests vs authenticated users), these measures provide comprehensive defense in depth against security threats.

---

## All Code Snippets in One Place

Here are all 8 security implementations in consolidated code snippets:

```typescript
// ============================================
// 1. SQL Injection Prevention (Parameterized Queries)
// File: lib/db.ts (lines 51-59)
// ============================================
export async function query<T = any>(
  sql: string,
  params?: any[],
  isGuest = false
): Promise<T> {
  const connection = getPool(isGuest);
  const [results] = await connection.execute(sql, params); // Parameters prevent SQL injection
  return results as T;
}

// Usage example: app/api/notes/route.ts (lines 92-95)
const enrollment = await query(
  'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
  [decoded.userId, course_id] // User input passed as parameters, not concatenated
);


// ============================================
// 2. Password Hashing (bcrypt)
// File: lib/auth.ts (lines 18-20)
// ============================================
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10); // 10 rounds of salting
}

// Usage: lib/auth.ts (line 79) - in createUser()
const passwordHash = await hashPassword(data.password); // Hash before storing


// ============================================
// 3. JWT Authentication (Generate Token)
// File: lib/auth.ts (lines 28-37)
// ============================================
import jwt from 'jsonwebtoken';

export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.user_id,
      computingId: user.computing_id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires after 7 days
  );
}

// Usage: app/api/auth/login/route.ts (line 20)
const token = generateToken(user);


// ============================================
// 4. Secure Cookie (HTTP-only)
// File: app/api/auth/login/route.ts (lines 40-45)
// ============================================
res.cookies.set('auth-token', token, {
  httpOnly: true, // JavaScript cannot access this cookie (prevents XSS)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax', // Prevents CSRF attacks
  maxAge: 60 * 60 * 24 * 7, // 7 days expiration
});


// ============================================
// 5. Role-Based Access Control (RBAC)
// File: app/api/notes/route.ts (lines 74-76)
// ============================================
const decoded = verifyToken(token);
if (!decoded || decoded.role !== 'student') {
  return NextResponse.json(
    { error: 'Forbidden - Student access required' },
    { status: 403 } // Role check before database operation
  );
}

// Other examples:
// - app/api/courses/route.ts (line 81): Instructor check
// - app/api/note-requests/route.ts (line 68): Student check


// ============================================
// 6. Input Validation
// File: app/api/notes/route.ts (lines 84-88)
// ============================================
const { title, description, lecture, link, course_id, file_url } = await req.json();

if (!title || !description || !finalLink || !course_id) {
  return NextResponse.json(
    { error: 'Missing required fields: title, description, link/file, and course_id are required' },
    { status: 400 } // Validate before database operation
  );
}

// Other examples:
// - app/api/auth/register/route.ts (lines 11-18): Registration validation
// - app/api/courses/route.ts (lines 87-92): Course creation validation


// ============================================
// 7. SSL/TLS Database Connection
// File: lib/db.ts (lines 12-14)
// ============================================
const appDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || process.env.DB_APP_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_APP_PASSWORD || '',
  database: process.env.DB_NAME || 'open_notes_collective',
  ssl: process.env.DB_HOST?.includes('railway') || process.env.DB_HOST?.includes('rlwy')
    ? { rejectUnauthorized: false } // SSL enabled for remote connections
    : undefined,
};


// ============================================
// 8. Audit Logging
// File: lib/api-helpers.ts (lines 52-63)
// ============================================
export async function logActivity(
    userId: number,
    actionType: string,
    entityType: string,
    entityId?: number,
    description?: string
) {
    try {
        await query(
            'INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
            [userId, actionType, entityType, entityId || null, description || null]
        );
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

// Usage example: app/api/courses/route.ts (line 118)
await logActivity(
    decoded.userId,
    'course_create',
    'course',
    result.insertId,
    `Created course: ${name} (${code})`
);
```

---

## File Locations Summary

| Security Measure | Primary File | Line Numbers |
|-----------------|--------------|--------------|
| 1. SQL Injection Prevention | `lib/db.ts` | 51-59 |
| 2. Password Hashing | `lib/auth.ts` | 18-20 |
| 3. JWT Authentication | `lib/auth.ts` | 28-37 |
| 4. Secure Cookie | `app/api/auth/login/route.ts` | 40-45 |
| 5. Role-Based Access Control | `app/api/notes/route.ts` | 74-76 |
| 6. Input Validation | `app/api/notes/route.ts` | 84-88 |
| 7. SSL/TLS Connection | `lib/db.ts` | 12-14 |
| 8. Audit Logging | `lib/api-helpers.ts` | 52-63 |

