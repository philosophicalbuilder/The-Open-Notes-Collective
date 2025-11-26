# Google OAuth Setup Guide

## Quick Setup Steps

### 1. Create Google OAuth Credentials

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

### 2. Add to Environment Variables

Add to your `.env.local` file:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### 3. Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Add to `.env.local`:

```env
NEXTAUTH_SECRET=the-generated-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### 4. Test OAuth Flow

1. Start your dev server: `pnpm dev`
2. Go to http://localhost:3000
3. Select role (Student/Instructor)
4. Click "Continue with Google"
5. Sign in with a @virginia.edu email (or your test email)
6. You should be redirected to the appropriate dashboard

## Important Notes

- **Email Domain Restriction**: The app only allows `@virginia.edu` emails
- **Role Assignment**: Role is set after first OAuth login based on user selection
- **Session Management**: Sessions are stored in JWT tokens (stateless)
- **Database**: User is automatically created in database on first OAuth login

## Troubleshooting

### "Redirect URI mismatch"
- Make sure the redirect URI in Google Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- Check for trailing slashes or http vs https

### "Access blocked"
- If in testing mode, make sure your email is added as a test user
- Check OAuth consent screen configuration

### "User not created"
- Check database connection
- Verify email domain is @virginia.edu
- Check server logs for errors

## Production Deployment

When deploying to production:

1. Update redirect URI in Google Console to your production URL
2. Update `NEXTAUTH_URL` in environment variables
3. Make sure OAuth consent screen is published (if going public)

