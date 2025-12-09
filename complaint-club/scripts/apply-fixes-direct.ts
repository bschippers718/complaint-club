#!/usr/bin/env tsx
/**
 * Apply ALL FIXES migration directly via Supabase client
 */

import { createServiceClient } from '../lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabase = createServiceClient()

async function executeSQL(sql: string): Promise<void> {
  // Split SQL into executable statements
  // For function definitions, we need to execute them as complete blocks
  const functionBlocks = sql.match(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$ LANGUAGE plpgsql[^;]*;/g) || []
  const otherStatements = sql
    .replace(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$ LANGUAGE plpgsql[^;]*;/g, '')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  // Execute function definitions first
  for (const func of functionBlocks) {
    try {
      // Use RPC to execute - but we need exec_sql function
      // For now, we'll use the Supabase REST API directly
      const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || ''
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      
      if (!projectUrl || !serviceKey) {
        throw new Error('Missing Supabase credentials')
      }

      // Try using PostgREST to execute via a custom function
      // Actually, we can't execute raw SQL via PostgREST
      // We need to use the Management API or run via SQL Editor
      console.log('⚠️  Cannot execute raw SQL via Supabase JS client')
      console.log('   Please run APPLY_ALL_FIXES.sql in Supabase SQL Editor')
      return
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }
}

async function main() {
  console.log('🔧 Applying ALL FIXES migration...\n')

  try {
    // Since we can't execute raw SQL, let's try to update using RPC functions
    // First check if the functions exist and work
    
    console.log('1. Testing current chaos scores function...')
    const { error: testError } = await supabase.rpc('update_chaos_scores')
    
    if (testError) {
      console.log('   ⚠️  Function needs updating:', testError.message)
      console.log('\n   📝 To fix this, please:')
      console.log('   1. Go to Supabase SQL Editor')
      console.log('   2. Run: supabase/migrations/APPLY_ALL_FIXES.sql')
      console.log('   3. Then run this script again\n')
      return
    }

    console.log('   ✅ Function exists, updating chaos scores...')
    
    // Refresh aggregates first
    console.log('\n2. Refreshing summary aggregates...')
    const { error: refreshError } = await supabase.rpc('refresh_summary_aggregates')
    if (refreshError) {
      console.error('   ❌ Error:', refreshError.message)
    } else {
      console.log('   ✅ Aggregates refreshed!')
    }

    // Update chaos scores
    console.log('\n3. Updating chaos scores...')
    const { error: chaosError } = await supabase.rpc('update_chaos_scores')
    if (chaosError) {
      console.error('   ❌ Error:', chaosError.message)
    } else {
      console.log('   ✅ Chaos scores updated!')
    }

    // Verify
    console.log('\n4. Verifying results...')
    const { data, error: verifyError } = await supabase
      .from('aggregates_summary')
      .select('neighborhood_id, total, noise, rats, parking, trash, chaos_score')
      .eq('timeframe', 'month')
      .order('total', { ascending: false })
      .limit(5)

    if (verifyError) {
      console.error('   ❌ Error:', verifyError.message)
    } else if (data && data.length > 0) {
      const maxTotal = data[0].total || 1
      const maxNoise = data[0].noise || 1
      const maxRats = data[0].rats || 1
      const maxParking = data[0].parking || 1
      const maxTrash = data[0].trash || 1
      
      console.log('\n   Top 5 neighborhoods:')
      data.forEach((row, i) => {
        const expected = Math.round(
          (Math.min(row.total / maxTotal, 1) * 0.5 +
           Math.min(row.noise / maxNoise, 1) * 0.2 +
           Math.min(row.rats / maxRats, 1) * 0.15 +
           Math.min(row.parking / maxParking, 1) * 0.1 +
           Math.min(row.trash / maxTrash, 1) * 0.05) * 100
        )
        const match = Math.abs(row.chaos_score - expected) < 5 ? '✅' : '⚠️'
        console.log(`   ${i + 1}. Total: ${row.total}, Chaos: ${row.chaos_score} (expected: ~${expected}) ${match}`)
      })
    }

    console.log('\n✅ Done!')
    
  } catch (error) {
    console.error('\n❌ Error:', error)
  }
}

main().catch(console.error)

