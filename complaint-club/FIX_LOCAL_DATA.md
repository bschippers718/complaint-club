# Fix: No Data on Local Server

## Problem
After removing mock data fallbacks, the local server requires Supabase environment variables to be configured in `.env.local`.

## Solution

Your `.env.local` file exists, but you need to make sure it has these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lphkkpczptbqokbtfjuz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaGtrcGN6cHRicW9rYnRmanV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NTQwMjUsImV4cCI6MjA4MDUzMDAyNX0.vnrgAHsyqoQIcz1rTumUkO6Cv8G59BNQnuI7WiAerAE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
CRON_SECRET=your_cron_secret
```

## Steps to Fix

1. **Open `.env.local`** in the `complaint-club` directory

2. **Add/Update these variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://lphkkpczptbqokbtfjuz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (the anon key above)
   - `SUPABASE_SERVICE_ROLE_KEY` = Get this from: https://supabase.com/dashboard/project/lphkkpczptbqokbtfjuz/settings/api
   - `CRON_SECRET` = Generate with: `openssl rand -hex 32`

3. **Restart your dev server**:
   ```bash
   # Stop the server (Ctrl+C in the terminal running npm run dev)
   # Then restart:
   npm run dev
   ```

4. **Verify it's working**:
   - Visit: http://localhost:3000
   - You should see data loading now

## Why This Happened

We removed all mock data fallbacks to ensure both local and production use the same real Supabase database. This means the local server now requires the same environment variables as production.

## Get Service Role Key

The service role key is secret and not stored in the repo. Get it from:
- https://supabase.com/dashboard/project/lphkkpczptbqokbtfjuz/settings/api
- Look for the **service_role** key (it's a long JWT token starting with `eyJ...`)

