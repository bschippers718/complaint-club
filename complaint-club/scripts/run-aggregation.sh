#!/bin/bash
# Script to run the aggregation endpoint
# This will recalculate chaos scores and refresh aggregates

# Get CRON_SECRET from environment or .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep CRON_SECRET | xargs)
fi

# Check if CRON_SECRET is set
if [ -z "$CRON_SECRET" ]; then
  echo "Error: CRON_SECRET not found in environment"
  echo "Please set it in .env.local or export it:"
  echo "  export CRON_SECRET=your_secret_here"
  exit 1
fi

# Get the base URL (default to localhost:3000 if NEXT_PUBLIC_SITE_URL is not set)
BASE_URL=${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}

echo "Running aggregation refresh..."
echo "URL: $BASE_URL/api/cron/aggregate"

# Make the POST request
curl -X POST "$BASE_URL/api/cron/aggregate" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "Done! Check the response above."


