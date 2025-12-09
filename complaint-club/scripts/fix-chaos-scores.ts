#!/usr/bin/env tsx
/**
 * Fix Chaos Scores Script
 * 
 * This script:
 * 1. Runs the APPLY_ALL_FIXES migration to update the chaos score function
 * 2. Recalculates all chaos scores using the correct formula
 * 
 * Usage:
 *   tsx scripts/fix-chaos-scores.ts
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
  // Supabase JS client doesn't support raw SQL execution
  // We'll use RPC calls instead
  console.log('⚠️  Cannot execute raw SQL via client.')
  console.log('📝 Please run the APPLY_ALL_FIXES.sql migration in Supabase SQL Editor:')
  console.log('   1. Go to your Supabase project dashboard')
  console.log('   2. Navigate to SQL Editor')
  console.log('   3. Copy and paste the contents of: supabase/migrations/APPLY_ALL_FIXES.sql')
  console.log('   4. Click "Run"')
  throw new Error('Manual SQL execution required')
}

async function fixChaosScores(): Promise<void> {
  console.log('🔧 Fixing chaos scores...\n')

  try {
    // Step 1: Try to update chaos scores using the RPC function
    console.log('1. Updating chaos scores using database function...')
    const { error: chaosError } = await supabase.rpc('update_chaos_scores')
    
    if (chaosError) {
      console.error('   ❌ Error:', chaosError.message)
      console.log('\n   💡 The update_chaos_scores function may need to be updated.')
      console.log('   Please run APPLY_ALL_FIXES.sql in Supabase SQL Editor first.')
      throw chaosError
    }
    
    console.log('   ✅ Chaos scores updated successfully!')
    
    // Step 2: Verify the results
    console.log('\n2. Verifying chaos scores...')
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
        console.log(`   ${i + 1}. Total: ${row.total}, Chaos: ${row.chaos_score}`)
      })
    }
    
    // Step 3: Check for neighborhoods with complaints but zero chaos score
    console.log('\n3. Checking for data issues...')
    const { data: zeroChaos, error: zeroError } = await supabase
      .from('aggregates_summary')
      .select('neighborhood_id, total, chaos_score')
      .eq('timeframe', 'month')
      .gt('total', 0)
      .eq('chaos_score', 0)
    
    if (zeroError) {
      console.error('   ⚠️  Could not check:', zeroError.message)
    } else if (zeroChaos && zeroChaos.length > 0) {
      console.log(`   ⚠️  Found ${zeroChaos.length} neighborhoods with complaints but chaos_score = 0`)
      console.log('   This may indicate the chaos score function needs updating.')
    } else {
      console.log('   ✅ No neighborhoods with zero chaos scores found')
    }
    
    console.log('\n✅ Chaos score fix complete!')
    
  } catch (error) {
    console.error('\n❌ Error fixing chaos scores:', error)
    console.error('\n📝 Manual steps required:')
    console.error('   1. Go to Supabase SQL Editor')
    console.error('   2. Run: supabase/migrations/APPLY_ALL_FIXES.sql')
    console.error('   3. Then run this script again')
    process.exit(1)
  }
}

async function main() {
  console.log('🗄️  Fixing Chaos Scores in Supabase\n')
  console.log(`📡 Connecting to: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}\n`)
  
  await fixChaosScores()
}

main().catch(console.error)
