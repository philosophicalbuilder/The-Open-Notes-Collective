# Deployment Guide

## Quick Deploy to Vercel

### Step 1: Login to Vercel
```bash
cd final
npx vercel login
```

### Step 2: Deploy
```bash
npx vercel --prod
```

### Step 3: Set Environment Variables

After deployment, go to your Vercel dashboard and add these environment variables:

1. **Database Variables:**
   - `DB_HOST` - Your MySQL database host (e.g., from PlanetScale, Railway, or AWS RDS)
   - `DB_PORT` - Usually `3306`
   - `DB_USER` - Database username
   - `DB_PASSWORD` - Database password
   - `DB_NAME` - Database name (usually `open_notes_collective`)

2. **NextAuth Variables:**
   - `NEXTAUTH_URL` - Your production URL (e.g., `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`

3. **Google OAuth:**
   - `GOOGLE_CLIENT_ID` - From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

### Step 4: Update Google OAuth Redirect URI

In Google Cloud Console, add your production callback URL:
- `https://your-app.vercel.app/api/auth/callback/google`

### Step 5: Redeploy

After setting environment variables, redeploy:
```bash
npx vercel --prod
```

Or trigger a redeploy from the Vercel dashboard.

## Database Setup Options

### Option 1: PlanetScale (Recommended - Free Tier)
1. Sign up at https://planetscale.com
2. Create a new database
3. Copy connection credentials
4. Update environment variables in Vercel

### Option 2: Railway
1. Sign up at https://railway.app
2. Create a new MySQL database
3. Copy connection credentials
4. Update environment variables in Vercel

### Option 3: AWS RDS
1. Create MySQL instance in AWS RDS
2. Configure security groups
3. Copy connection credentials
4. Update environment variables in Vercel

## Database Schema

After setting up your database, run the schema:
```bash
mysql -u your-user -p your-database < scripts/database-schema.sql
```

Or use the setup script (requires local .env.local):
```bash
pnpm setup-db
```

## Troubleshooting

- **Build fails**: Check that all environment variables are set in Vercel dashboard
- **Database connection errors**: Verify DB credentials and ensure database is accessible from Vercel's IP ranges
- **OAuth errors**: Make sure redirect URI in Google Console matches your production URL exactly



