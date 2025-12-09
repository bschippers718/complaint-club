# Fix Chaos Scores - Step by Step Guide

## Problem
Chaos scores are not calculating correctly. The database function needs to be updated to use dynamic max values instead of fixed values.

## Solution

### Step 1: Update the Database Function (Required)

You need to run the `APPLY_ALL_FIXES.sql` migration in Supabase SQL Editor:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click on **SQL Editor**

2. **Run the Migration**
   - Open the file: `supabase/migrations/APPLY_ALL_FIXES.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

3. **Verify it worked**
   - You should see "Success. No rows returned"
   - The function `update_chaos_scores()` has been updated

### Step 2: Recalculate Chaos Scores

After updating the function, you need to recalculate all chaos scores. You have two options:

#### Option A: Via API Endpoint (Recommended)

```bash
# Make sure your local server is running
# Then call the aggregation endpoint:
curl -X POST http://localhost:3000/api/cron/aggregate \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or if you don't have CRON_SECRET set locally, you can temporarily disable auth or use the admin endpoint:

```bash
curl -X POST http://localhost:3000/api/admin/fix-chaos \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### Option B: Via Supabase SQL Editor

After running APPLY_ALL_FIXES.sql, it automatically runs:
- `SELECT refresh_summary_aggregates();`
- `SELECT update_chaos_scores();`

So the scores should already be recalculated!

### Step 3: Verify the Fix

Check that chaos scores are now correct:

1. **In Supabase SQL Editor**, run:
```sql
SELECT 
  n.name,
  s.total,
  s.noise,
  s.rats,
  s.parking,
  s.trash,
  s.chaos_score
FROM aggregates_summary s
JOIN neighborhoods n ON n.id = s.neighborhood_id
WHERE s.timeframe = 'month'
ORDER BY s.total DESC
LIMIT 10;
```

2. **Check your local app**
   - Visit http://localhost:3000
   - Check a few neighborhoods
   - Verify chaos scores look reasonable

## What Changed?

The chaos score calculation now:
- ✅ Uses **dynamic max values** from actual data (not fixed values)
- ✅ Uses correct weights: total (0.5), noise (0.2), rats (0.15), parking (0.1), trash (0.05)
- ✅ Matches the TypeScript calculation in `lib/chaos-score.ts`

## Troubleshooting

### Chaos scores are still wrong
- Make sure you ran `APPLY_ALL_FIXES.sql` completely
- Check that the function was updated: `SELECT pg_get_functiondef('update_chaos_scores'::regproc);`
- Run `SELECT update_chaos_scores();` again manually

### Scores are all zero
- Check that you have data in `aggregates_summary` table
- Run `SELECT refresh_summary_aggregates();` first
- Then run `SELECT update_chaos_scores();`

### Function doesn't exist
- Make sure you ran migrations in order:
  1. `001_initial_schema.sql`
  2. `002_aggregation_functions.sql`
  3. `003_helper_rpcs.sql`
  4. `004_geojson_rpc.sql`
  5. `008_add_new_categories.sql` (or `APPLY_ALL_FIXES.sql`)
