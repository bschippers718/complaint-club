# Verify Production Database Connection

## Current Supabase Project

- **Project ID**: `lphkkpczptbqokbtfjuz`
- **Project Name**: `complaint-club`
- **Project URL**: `https://lphkkpczptbqokbtfjuz.supabase.co`
- **Status**: ACTIVE_HEALTHY

## Required Environment Variables in Vercel

Your production site needs these environment variables set in Vercel:

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lphkkpczptbqokbtfjuz.supabase.co` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon key) | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (service_role key) | Supabase Dashboard → Settings → API → service_role |
| `CRON_SECRET` | Your generated secret | Generate with: `openssl rand -hex 32` |

## Steps to Verify/Update Vercel Environment Variables

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/[your-team]/complaint-club
   - Or: https://vercel.com/dashboard

2. **Navigate to Environment Variables**
   - Go to: **Settings** → **Environment Variables**

3. **Verify/Add Each Variable**
   
   For each variable above:
   - Check if it exists
   - If missing, click **Add** and enter:
     - **Key**: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
     - **Value**: The value from Supabase
     - **Environment**: Select **Production**, **Preview**, and **Development**

4. **Get Your Supabase Keys**
   - Go to: https://supabase.com/dashboard/project/lphkkpczptbqokbtfjuz/settings/api
   - Copy:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **service_role** key (secret) → `SUPABASE_SERVICE_ROLE_KEY`

5. **Redeploy After Changes**
   - After updating environment variables, go to **Deployments**
   - Click **Redeploy** on the latest deployment
   - Or push a new commit to trigger a deployment

## Quick Verification

After updating, you can verify the production site is using the correct database by:

1. **Check the production site**: https://311complaints.nyc
2. **Verify chaos scores match** what we just fixed
3. **Check a neighborhood** - should show the updated chaos scores

## Current Database Status

✅ **Migrations Applied**:
- `001_initial_schema.sql` ✅
- `002_aggregation_functions.sql` ✅
- `003_helper_rpcs.sql` ✅
- `004_geojson_rpc.sql` ✅
- `008_add_new_categories.sql` ✅
- `APPLY_ALL_FIXES.sql` ✅ (just completed)

✅ **Chaos Scores**: Fixed and recalculated
✅ **Database Functions**: All updated

## Test Production Connection

You can test if production is connected by visiting:
- https://311complaints.nyc/api/leaderboard
- Should return data from the same database
