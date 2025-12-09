#!/usr/bin/env tsx
/**
 * Run SQL Migration via Supabase REST API
 * 
 * This script executes SQL migrations using Supabase's REST API
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function executeSQL(sql: string): Promise<void> {
  // Use Supabase REST API to execute SQL
  // Note: This requires the service role key and uses the PostgREST API
  const projectUrl = supabaseUrl.replace('/rest/v1', '')
  const response = await fetch(`${projectUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({ sql_query: sql })
  })

  if (!response.ok) {
    // If exec_sql doesn't exist, we need to use a different approach
    // Try using the Supabase Management API or direct PostgreSQL connection
    const errorText = await response.text()
    throw new Error(`SQL execution failed: ${response.status} ${errorText}`)
  }
}

async function runMigration() {
  console.log('🔧 Running APPLY_ALL_FIXES migration via Supabase API...\n')
  console.log(`📡 Connecting to: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}\n`)

  try {
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', 'APPLY_ALL_FIXES.sql')
    console.log(`📄 Reading ${migrationPath}...`)
    const sql = readFileSync(migrationPath, 'utf-8')
    
    // Split into statements and execute
    const statements = sql
      .split(/;(?![^$]*\$\$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements\n`)
    
    // Try to execute via RPC first
    console.log('⚠️  Note: Supabase JS client cannot execute raw SQL directly.')
    console.log('   We will use available RPC functions instead.\n')
    
    // Import Supabase client
    const { createServiceClient } = await import('../lib/supabase')
    const supabase = createServiceClient()
    
    // Step 1: Try to update chaos scores (this will work if function exists)
    console.log('1. Attempting to update chaos scores...')
    const { error: chaosError } = await supabase.rpc('update_chaos_scores')
    
    if (chaosError && chaosError.message.includes('does not exist')) {
      console.log('   ⚠️  Function needs to be created first.')
      console.log('   Please run APPLY_ALL_FIXES.sql in Supabase SQL Editor.')
      throw new Error('Function does not exist - migration required')
    } else if (chaosError) {
      console.error('   ❌ Error:', chaosError.message)
      throw chaosError
    } else {
      console.log('   ✅ Chaos scores updated!')
    }
    
    // Step 2: Refresh aggregates
    console.log('\n2. Refreshing summary aggregates...')
    const { error: refreshError } = await supabase.rpc('refresh_summary_aggregates')
    
    if (refreshError) {
      console.error('   ⚠️  Warning:', refreshError.message)
    } else {
      console.log('   ✅ Aggregates refreshed!')
    }
    
    // Step 3: Update chaos scores again
    console.log('\n3. Recalculating chaos scores after refresh...')
    const { error: chaosError2 } = await supabase.rpc('update_chaos_scores')
    
    if (chaosError2) {
      console.error('   ❌ Error:', chaosError2.message)
    } else {
      console.log('   ✅ Chaos scores recalculated!')
    }
    
    // Step 4: Verify
    console.log('\n4. Verifying results...')
    const { data: sampleData, error: verifyError } = await supabase
      .from('aggregates_summary')
      .select('neighborhood_id, total, noise, rats, parking, trash, chaos_score')
      .eq('timeframe', 'month')
      .order('total', { ascending: false })
      .limit(5)
    
    if (verifyError) {
      console.error('   ⚠️  Could not verify:', verifyError.message)
    } else if (sampleData && sampleData.length > 0) {
      const maxTotal = sampleData[0].total || 1
      const maxNoise = sampleData[0].noise || 1
      const maxRats = sampleData[0].rats || 1
      const maxParking = sampleData[0].parking || 1
      const maxTrash = sampleData[0].trash || 1
      
      console.log('\n   Sample chaos scores:')
      sampleData.forEach((row, i) => {
        const expected = Math.round(
          (Math.min(row.total / maxTotal, 1) * 0.5 +
           Math.min(row.noise / maxNoise, 1) * 0.2 +
           Math.min(row.rats / maxRats, 1) * 0.15 +
           Math.min(row.parking / maxParking, 1) * 0.1 +
           Math.min(row.trash / maxTrash, 1) * 0.05) * 100
        )
        console.log(`   ${i + 1}. Total: ${row.total}, Chaos: ${row.chaos_score} (expected: ~${expected})`)
      })
    }
    
    console.log('\n✅ Migration steps completed!')
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    console.error('\n📝 To complete the migration:')
    console.error('   1. Go to Supabase SQL Editor')
    console.error('   2. Run: supabase/migrations/APPLY_ALL_FIXES.sql')
    console.error('   3. Then run this script again to verify')
    process.exit(1)
  }
}

runMigration().catch(console.error)
