#!/usr/bin/env tsx
import { createServiceClient } from '../lib/supabase'

const supabase = createServiceClient()

async function main() {
  console.log('🔧 Fixing chaos scores and running migrations...\n')

  // Step 1: Try to update chaos scores
  console.log('1. Updating chaos scores...')
  const { error: chaosError } = await supabase.rpc('update_chaos_scores')
  
  if (chaosError) {
    console.log('   ⚠️  Function may need updating:', chaosError.message)
    console.log('   💡 You may need to run APPLY_ALL_FIXES.sql in Supabase SQL Editor first')
  } else {
    console.log('   ✅ Chaos scores updated!')
  }

  // Step 2: Refresh aggregates
  console.log('\n2. Refreshing summary aggregates...')
  const { error: refreshError } = await supabase.rpc('refresh_summary_aggregates')
  if (refreshError) {
    console.log('   ⚠️  Error:', refreshError.message)
  } else {
    console.log('   ✅ Aggregates refreshed!')
  }

  // Step 3: Update chaos scores again
  console.log('\n3. Recalculating chaos scores after refresh...')
  const { error: chaosError2 } = await supabase.rpc('update_chaos_scores')
  if (chaosError2) {
    console.log('   ❌ Error:', chaosError2.message)
  } else {
    console.log('   ✅ Chaos scores recalculated!')
  }

  // Step 4: Verify
  console.log('\n4. Verifying results...')
  const { data, error: verifyError } = await supabase
    .from('aggregates_summary')
    .select('neighborhood_id, total, noise, rats, parking, trash, chaos_score')
    .eq('timeframe', 'month')
    .order('total', { ascending: false })
    .limit(5)

  if (verifyError) {
    console.log('   ⚠️  Could not verify:', verifyError.message)
  } else if (data && data.length > 0) {
    const maxTotal = data[0].total || 1
    const maxNoise = data[0].noise || 1
    const maxRats = data[0].rats || 1
    const maxParking = data[0].parking || 1
    const maxTrash = data[0].trash || 1
    
    console.log('\n   Top 5 neighborhoods by total complaints:')
    data.forEach((row, i) => {
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

  console.log('\n✅ Done!')
}

main().catch(console.error)
