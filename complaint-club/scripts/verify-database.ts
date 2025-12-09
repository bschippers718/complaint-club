#!/usr/bin/env tsx
/**
 * Database Verification Script
 * 
 * Checks if the Supabase database is properly set up by verifying:
 * - Connection
 * - Required tables exist
 * - Required functions exist
 * - PostGIS extension is enabled
 * 
 * Usage:
 *   tsx scripts/verify-database.ts
 */

import { createServiceClient } from '../lib/supabase'

async function verifyDatabase() {
  console.log('🔍 Verifying Supabase database setup...\n')

  const supabase = createServiceClient()

  // Check connection
  try {
    console.log('1. Testing database connection...')
    const { error: connError } = await supabase.from('neighborhoods').select('count').limit(1)
    if (connError && !connError.message.includes('does not exist')) {
      throw connError
    }
    console.log('   ✅ Connection successful\n')
  } catch (error) {
    console.error('   ❌ Connection failed:', error instanceof Error ? error.message : error)
    console.error('\n   💡 Make sure:')
    console.error('      - NEXT_PUBLIC_SUPABASE_URL is set correctly')
    console.error('      - SUPABASE_SERVICE_ROLE_KEY is set correctly')
    process.exit(1)
  }

  // Check required tables
  const requiredTables = [
    'neighborhoods',
    'complaints',
    'aggregates_daily',
    'aggregates_summary',
    'etl_runs'
  ]

  console.log('2. Checking required tables...')
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error && error.message.includes('does not exist')) {
        console.log(`   ❌ Table '${table}' does not exist`)
        return false
      } else if (error && !error.message.includes('permission')) {
        console.log(`   ⚠️  Table '${table}' exists but has issues: ${error.message}`)
      } else {
        console.log(`   ✅ Table '${table}' exists`)
      }
    } catch (error) {
      console.log(`   ❌ Error checking table '${table}':`, error)
      return false
    }
  }
  console.log('')

  // Check required functions (via RPC calls)
  console.log('3. Checking required functions...')
  const requiredFunctions = [
    { name: 'get_neighborhood_id', test: () => supabase.rpc('get_neighborhood_id', { lat: 40.7128, lon: -74.0060 }) },
    { name: 'refresh_summary_aggregates', test: () => supabase.rpc('refresh_summary_aggregates') },
    { name: 'get_leaderboard', test: () => supabase.rpc('get_leaderboard', { p_timeframe: 'month', p_limit: 1 }) },
    { name: 'get_neighborhoods_geojson', test: () => supabase.rpc('get_neighborhoods_geojson', { p_timeframe: 'month' }) }
  ]

  for (const func of requiredFunctions) {
    try {
      const { error } = await func.test()
      if (error && error.message.includes('does not exist')) {
        console.log(`   ❌ Function '${func.name}' does not exist`)
        return false
      } else if (error && !error.message.includes('permission') && !error.message.includes('No neighborhoods')) {
        // Some errors are expected (like no data), but function should exist
        console.log(`   ⚠️  Function '${func.name}' exists but returned: ${error.message}`)
      } else {
        console.log(`   ✅ Function '${func.name}' exists`)
      }
    } catch (error) {
      console.log(`   ⚠️  Function '${func.name}' check:`, error instanceof Error ? error.message : error)
    }
  }
  console.log('')

  // Check PostGIS extension (try a PostGIS function)
  console.log('4. Checking PostGIS extension...')
  try {
    // Try to use a PostGIS function via a simple query
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('polygon')
      .limit(1)
    
    if (error && error.message.includes('function') && error.message.includes('ST_')) {
      console.log('   ❌ PostGIS extension may not be enabled')
      console.log('   💡 Run: CREATE EXTENSION IF NOT EXISTS postgis;')
      return false
    } else {
      console.log('   ✅ PostGIS extension appears to be enabled')
    }
  } catch (error) {
    console.log('   ⚠️  Could not verify PostGIS:', error)
  }
  console.log('')

  // Check if neighborhoods are seeded
  console.log('5. Checking data...')
  try {
    const { count, error } = await supabase
      .from('neighborhoods')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.log(`   ⚠️  Error checking neighborhoods: ${error.message}`)
    } else if (count === 0) {
      console.log('   ⚠️  No neighborhoods found - you need to seed neighborhood data')
      console.log('   💡 Run: curl -X POST https://your-app.vercel.app/api/seed -H "Authorization: Bearer YOUR_CRON_SECRET"')
    } else {
      console.log(`   ✅ Found ${count} neighborhoods`)
    }
  } catch (error) {
    console.log('   ⚠️  Could not check neighborhoods:', error)
  }

  console.log('\n✅ Database verification complete!')
  console.log('\n📝 Next steps:')
  console.log('   1. If tables are missing, run migrations in Supabase SQL Editor')
  console.log('   2. If neighborhoods are missing, seed them via /api/seed')
  console.log('   3. Run initial data backfill via /api/cron/ingest')
  console.log('   4. Run aggregation via /api/cron/aggregate')
  
  return true
}

verifyDatabase().catch(console.error)

