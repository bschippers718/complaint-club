# Setup Local Environment Variables

## Issue
After removing mock data fallbacks, the local server requires Supabase environment variables to be configured.

## Quick Fix

You need to create or update your `.env.local` file in the `complaint-club` directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lphkkpczptbqokbtfjuz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwaGtrcGN6cHRicW9rYnRmanV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NTQwMjUsImV4cCI6MjA4MDUzMDAyNX0.vnrgAHsyqoQIcz1rTumUkO6Cv8G59BNQnuI7WiAerAE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
CRON_SECRET=your_cron_secret_here
```

## Steps

1. **Get your Service Role Key** (this is secret, not in the repo):
   - Go to: https://supabase.com/dashboard/project/lphkkpczptbqokbtfjuz/settings/api
   - Copy the **service_role** key (starts with `eyJ...`)
   - ⚠️ **Keep this secret!** Never commit it to git.

2. **Generate a Cron Secret**:
   ```bash
   openssl rand -hex 32
   ```

3. **Create/Update `.env.local`**:
   ```bash
   cd complaint-club
   # Create or edit .env.local
   ```

4. **Restart your dev server**:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

## Verify It's Working

After setting up the environment variables and restarting:

```bash
curl http://localhost:3000/api/neighborhoods | jq '.data.neighborhoods | length'
```

Should return `250` (the number of neighborhoods in the database).

## Note

The `.env.local` file is gitignored, so your local credentials won't be committed. Make sure you have the correct values from your Supabase dashboard.
