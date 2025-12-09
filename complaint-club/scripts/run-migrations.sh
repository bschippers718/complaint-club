#!/bin/bash
# Script to help run Supabase migrations
# This script reads migration files and provides instructions

set -e

MIGRATIONS_DIR="supabase/migrations"
MIGRATIONS=(
  "001_initial_schema.sql"
  "002_aggregation_functions.sql"
  "003_helper_rpcs.sql"
  "004_geojson_rpc.sql"
  "008_add_new_categories.sql"
)

echo "🗄️  Complaint Club - Database Migration Helper"
echo "=============================================="
echo ""

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ Error: $MIGRATIONS_DIR directory not found"
  exit 1
fi

echo "📋 Migration files to run (in order):"
for i in "${!MIGRATIONS[@]}"; do
  migration="${MIGRATIONS[$i]}"
  if [ -f "$MIGRATIONS_DIR/$migration" ]; then
    echo "   $((i+1)). ✅ $migration"
  else
    echo "   $((i+1)). ❌ $migration (not found)"
  fi
done

echo ""
echo "📝 Instructions:"
echo "   1. Go to your Supabase project dashboard"
echo "   2. Navigate to: SQL Editor"
echo "   3. Run each migration file in order (copy/paste contents)"
echo ""
echo "💡 Quick copy commands:"
echo ""

for migration in "${MIGRATIONS[@]}"; do
  if [ -f "$MIGRATIONS_DIR/$migration" ]; then
    echo "   # $migration"
    echo "   cat $MIGRATIONS_DIR/$migration"
    echo ""
  fi
done

echo "✅ After running all migrations, you can:"
echo "   - Seed neighborhoods: curl -X POST https://your-app.vercel.app/api/seed -H 'Authorization: Bearer YOUR_CRON_SECRET'"
echo "   - Run data backfill: curl -X POST https://your-app.vercel.app/api/cron/ingest -H 'Authorization: Bearer YOUR_CRON_SECRET'"
