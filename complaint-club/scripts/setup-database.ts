#!/usr/bin/env tsx
/**
 * Database Setup Script
 * 
 * This script runs all database migrations in order to set up the Supabase database.
 * 
 * Usage:
 *   tsx scripts/setup-database.ts
 * 
 * Requires environment variables:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease set these in your .env.local file or export them.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Migration files in order
const migrations = [
  '001_initial_schema.sql',
  '002_aggregation_functions.sql',
  '003_helper_rpcs.sql',
  '004_geojson_rpc.sql',
  '008_add_new_categories.sql'
]

async function runMigration(filename: string): Promise<void> {
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', filename)
  
  try {
    console.log(`\n📄 Reading ${filename}...`)
    const sql = readFileSync(migrationPath, 'utf-8')
    
    // Split by semicolons but preserve function definitions
    // This is a simple approach - for complex SQL, you might want to use a proper SQL parser
    const statements = sql
      .split(/;(?![^$]*\$\$)/) // Split on semicolons not inside $$ blocks
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`   Executing ${statements.length} statement(s)...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement || statement.length < 10) continue // Skip very short statements
      
      try {
        // Use RPC to execute SQL (requires exec_sql function, or use direct query)
        // For now, we'll use the REST API's SQL execution
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          // If exec_sql doesn't exist, try direct query (this might not work for all statements)
          console.warn(`   ⚠️  RPC failed, trying direct execution...`)
          // Note: Supabase client doesn't support raw SQL execution directly
          // We'll need to use the REST API or tell user to run in SQL Editor
          console.error(`   ❌ Cannot execute SQL directly via client.`)
          console.error(`   Please run this migration manually in Supabase SQL Editor.`)
          throw new Error(`Migration ${filename} requires manual execution`)
        }
      } catch (err) {
        console.error(`   ❌ Error executing statement ${i + 1}:`, err)
        throw err
      }
    }
    
    console.log(`   ✅ ${filename} completed successfully`)
  } catch (error) {
    if (error instanceof Error && error.message.includes('manual execution')) {
      throw error
    }
    console.error(`   ❌ Error running ${filename}:`, error)
    throw error
  }
}

async function main() {
  console.log('🗄️  Setting up Complaint Club database...\n')
  console.log(`📡 Connecting to: ${supabaseUrl!.replace(/\/\/.*@/, '//***@')}`)
  
  // Check connection
  try {
    const { data, error } = await supabase.from('neighborhoods').select('count').limit(1)
    if (error && !error.message.includes('does not exist')) {
      console.log('   ℹ️  Database connection verified')
    }
  } catch (err) {
    // Expected if tables don't exist yet
  }
  
  console.log('\n📦 Running migrations in order...')
  
  for (const migration of migrations) {
    try {
      await runMigration(migration)
    } catch (error) {
      console.error(`\n❌ Failed to run ${migration}`)
      console.error('\n💡 Tip: You can also run these migrations manually:')
      console.error('   1. Go to your Supabase project dashboard')
      console.error('   2. Navigate to SQL Editor')
      console.error(`   3. Copy and paste the contents of supabase/migrations/${migration}`)
      console.error('   4. Click "Run"')
      process.exit(1)
    }
  }
  
  console.log('\n✅ All migrations completed successfully!')
  console.log('\n📝 Next steps:')
  console.log('   1. Seed neighborhood data: npm run seed (or call /api/seed)')
  console.log('   2. Run initial data backfill: call /api/cron/ingest')
  console.log('   3. Run aggregation: call /api/cron/aggregate')
}

main().catch(console.error)

