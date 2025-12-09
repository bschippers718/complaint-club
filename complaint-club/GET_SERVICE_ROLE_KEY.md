# Get Your Service Role Key

## ✅ Correct Location

You need to go to **"API Keys"** (not "JWT Keys").

## Steps:

1. **In the left sidebar**, click on **"API Keys"** (it should be right above "JWT Keys" in the PROJECT SETTINGS section)

2. **On the API Keys page**, you'll see a table with different keys:
   - **anon** `public` - This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already set ✅)
   - **service_role** `secret` - This is what you need for `SUPABASE_SERVICE_ROLE_KEY`

3. **Find the "service_role" row**:
   - Look for the key labeled **"service_role"** with type **"secret"**
   - Click the **"Reveal"** or **"Copy"** button to get the key
   - ⚠️ **This key has admin privileges - keep it secret!**

4. **Update `.env.local`**:
   Replace this line:
   ```
   SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_SERVICE_ROLE_KEY_FROM_SUPABASE_DASHBOARD
   ```
   
   With:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ...your_actual_service_role_key_here...
   ```

5. **Restart the dev server**:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

## Quick Link

Go directly to API Keys:
https://supabase.com/dashboard/project/lphkkpczptbqokbtfjuz/settings/api

## Current Status

✅ **Already configured:**
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅  
- `CRON_SECRET` ✅

❌ **Needs to be added:**
- `SUPABASE_SERVICE_ROLE_KEY` - Get from **API Keys** page (not JWT Keys)

