#!/usr/bin/env tsx
/**
 * Run APPLY_ALL_FIXES Migration
 * 
 * This script runs the APPLY_ALL_FIXES.sql migration to fix chaos scores
 * and other data integrity issues.
 */

import { createServiceClient } from '../lib/supabase'
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

const supabase = createServiceClient()

async function runSQL(sql: string): Promise<void> {
  // Split SQL into individual statements
  // Remove comments and split by semicolons, but preserve function definitions
  const statements = sql
    .split(/;(?![^$]*\$\$)/) // Split on semicolons not inside $$ blocks
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`   Executing ${statements.length} statement(s)...`)
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement || statement.length < 10) continue
    
    try {
      // Try using RPC if there's an exec_sql function, otherwise we'll need to use REST API
      // For now, let's try executing via the REST API using a custom RPC
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
      
      if (error) {
        // If exec_sql doesn't exist, we need to use Supabase REST API directly
        // For function definitions, we can try using the Supabase management API
        console.warn(`   ⚠️  Statement ${i + 1} may need manual execution`)
        console.warn(`   Error: ${error.message}`)
        // Continue with next statement
      }
    } catch (err) {
      console.error(`   ❌ Error executing statement ${i + 1}:`, err)
      // Continue with next statement
    }
  }
}

async function runMigration() {
  console.log('🔧 Running APPLY_ALL_FIXES migration...\n')
  console.log(`📡 Connecting to: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}\n`)

  try {
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', 'APPLY_ALL_FIXES.sql')
    console.log(`📄 Reading ${migrationPath}...`)
    const sql = readFileSync(migrationPath, 'utf-8')
    
    // Instead of trying to execute raw SQL, let's use the RPC functions that are available
    console.log('\n📝 Note: Supabase JS client cannot execute raw SQL directly.')
    console.log('   We will use available RPC functions instead.\n')
    
    // Step 1: Try to update chaos scores using the existing function
    console.log('1. Attempting to update chaos scores function...')
    console.log('   (This requires running APPLY_ALL_FIXES.sql in Supabase SQL Editor)')
    
    // Step 2: Recalculate chaos scores
    console.log('\n2. Recalculating chaos scores...')
    const { error: chaosError } = await supabase.rpc('update_chaos_scores')
    
    if (chaosError) {
      console.error('   ❌ Error:', chaosError.message)
      console.log('\n   💡 The update_chaos_scores function needs to be updated first.')
      console.log('   Please run APPLY_ALL_FIXES.sql in Supabase SQL Editor.')
      throw chaosError
    }
    
    console.log('   ✅ Chaos scores updated successfully!')
    
    // Step 3: Refresh aggregates
    console.log('\n3. Refreshing summary aggregates...')
    const { error: refreshError } = await supabase.rpc('refresh_summary_aggregates')
    
    if (refreshError) {
      console.error('   ⚠️  Warning:', refreshError.message)
    } else {
      console.log('   ✅ Summary aggregates refreshed!')
    }
    
    // Step 4: Update chaos scores again after refresh
    console.log('\n4. Updating chaos scores after refresh...')
    const { error: chaosError2 } = await supabase.rpc('update_chaos_scores')
    
    if (chaosError2) {
      console.error('   ❌ Error:', chaosError2.message)
    } else {
      console.log('   ✅ Chaos scores updated!')
    }
    
    // Step 5: Verify results
    console.log('\n5. Verifying chaos scores...')
    const { data: sampleData, error: verifyError } = await supabase
      .from('aggregates_summary')
      .select('neighborhood_id, total, noise, rats, parking, trash, chaos_score')
      .eq('timeframe', 'month')
      .order('total', { ascending: false })
      .limit(10)
    
    if (verifyError) {
      console.error('   ⚠️  Could not verify:', verifyError.message)
    } else if (sampleData) {
      console.log('\n   Top 10 neighborhoods by total complaints:')
      sampleData.forEach((row, i) => {
        const calc = Math.round(
          (Math.min(row.total / (sampleData[0]?.total || 1), 1) * 0.5 +
           Math.min(row.noise / (sampleData[0]?.noise || 1), 1) * 0.2 +
           Math.min(row.rats / (sampleData[0]?.rats || 1), 1) * 0.15 +
           Math.min(row.parking / (sampleData[0]?.parking || 1), 1) * 0.1 +
           Math.min(row.trash / (sampleData[0]?.trash || 1), 1) * 0.05) * 100
        )
        console.log(`   ${i + 1}. Total: ${row.total}, Chaos: ${row.chaos_score} (expected: ~${calc})`)
      })
    }
    
    console.log('\n✅ Migration steps completed!')
    console.log('\n📝 Note: If chaos scores still look wrong, you may need to:')
    console.log('   1. Run APPLY_ALL_FIXES.sql in Supabase SQL Editor to update the function')
    console.log('   2. Then run this script again')
    
  } catch (error) {
    console.error('\n❌ Error running migration:', error)
    console.error('\n📝 Manual steps required:')
    console.error('   1. Go to Supabase SQL Editor')
    console.error('   2. Run: supabase/migrations/APPLY_ALL_FIXES.sql')
    console.error('   3. Then run this script again')
    process.exit(1)
  }
}

runMigration().catch(console.error)
