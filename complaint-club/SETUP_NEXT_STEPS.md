# Next Steps: Environment Variables & Database Setup

## ✅ Completed
- [x] Vercel project connected
- [x] Project deployed to Vercel

## 🔄 Next Steps

### Step 1: Set Up Supabase Database

1. **Create a Supabase Project** (if not already done)
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the database to initialize

2. **Run Database Migrations**
   
   **Option A: Using SQL Editor (Recommended)**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**
   - Run these migration files **in order** (copy/paste each file's contents):
     - `supabase/migrations/001_initial_schema.sql`
     - `supabase/migrations/002_aggregation_functions.sql`
     - `supabase/migrations/003_helper_rpcs.sql`
     - `supabase/migrations/004_geojson_rpc.sql`
     - `supabase/migrations/008_add_new_categories.sql`
   
   **Option B: Using Helper Script**
   ```bash
   npm run setup-db
   ```
   This will show you the migration files and provide copy commands.

3. **Verify Database Setup**
   ```bash
   npm run verify-db
   ```
   This will check if all tables, functions, and extensions are properly set up.

### Step 2: Configure Environment Variables in Vercel

1. **Get Your Supabase Credentials**
   - Go to your Supabase project dashboard
   - Navigate to **Settings** → **API**
   - Copy these values:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

2. **Generate a Cron Secret**
   - Generate a random secret string (e.g., use `openssl rand -hex 32`)
   - This will be your `CRON_SECRET`

3. **Add Environment Variables in Vercel**
   - Go to your Vercel project dashboard: https://vercel.com/[your-team]/complaint-club
   - Navigate to **Settings** → **Environment Variables**
   - Add the following variables:

   | Variable Name | Value | Environment |
   |--------------|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Production, Preview, Development |
   | `CRON_SECRET` | Your generated secret | Production, Preview, Development |

4. **Redeploy**
   - After adding environment variables, trigger a new deployment
   - Go to **Deployments** tab and click **Redeploy** on the latest deployment

### Step 3: Seed Neighborhood Data

After your Vercel deployment is live with environment variables:

1. **Get your deployment URL**
   - Your app should be at: `https://complaint-club.vercel.app` or similar

2. **Seed neighborhoods via API**
   ```bash
   curl -X POST https://complaint-club.vercel.app/api/seed \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

   Or use the Vercel dashboard to trigger this via a function call.

### Step 4: Initial Data Backfill

Populate historical complaint data:

```bash
# Backfill last 30 days of complaints
curl -X POST https://complaint-club.vercel.app/api/cron/ingest \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"since": "2024-11-01", "limit": 10000}'

# Run aggregation to calculate scores
curl -X POST https://complaint-club.vercel.app/api/cron/aggregate \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Step 5: Verify Everything Works

1. **Verify Database Setup** (if running locally)
   ```bash
   npm run verify-db
   ```

2. **Visit your deployed app**: `https://complaint-club.vercel.app`
   - Check that the leaderboard loads
   - Verify neighborhoods appear on the map
   - Test the compare feature

3. **Verify cron jobs are scheduled**
   - Check Vercel dashboard → Settings → Cron Jobs
   - Should see two cron jobs configured (ingest and aggregate)

## 📝 Notes

- **Cron Jobs**: The `vercel.json` configures daily cron jobs at 8 AM and 9 AM UTC
- **Vercel Pro Plan**: Required for cron intervals under 1 day (if you want more frequent updates)
- **Data Updates**: The cron jobs will automatically ingest new complaints daily

## 🆘 Troubleshooting

- **Missing environment variables**: Check Vercel dashboard → Settings → Environment Variables
- **Database errors**: Verify migrations ran successfully in Supabase SQL Editor
- **API errors**: Check Vercel function logs in the dashboard
- **No data showing**: Make sure you've seeded neighborhoods and run the initial backfill
