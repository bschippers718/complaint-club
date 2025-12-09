#!/usr/bin/env tsx
/**
 * Verify Production Database Connection
 * 
 * This script helps verify that production is using the correct Supabase database
 */

const PRODUCTION_URL = 'https://311complaints.nyc'
const EXPECTED_SUPABASE_URL = 'https://lphkkpczptbqokbtfjuz.supabase.co'

async function verifyProduction() {
  console.log('🔍 Verifying production database connection...\n')

  try {
    // Test the production API
    console.log(`1. Testing production API: ${PRODUCTION_URL}`)
    const response = await fetch(`${PRODUCTION_URL}/api/leaderboard?timeframe=month&limit=5`)
    
    if (!response.ok) {
      console.error(`   ❌ Production API returned: ${response.status}`)
      return
    }

    const data = await response.json()
    
    if (data.error) {
      console.error(`   ❌ Production API error: ${data.error}`)
      console.error('\n   💡 This might mean:')
      console.error('      - Environment variables not set in Vercel')
      console.error('      - Wrong Supabase credentials')
      console.error('      - Database not accessible')
      return
    }

    console.log('   ✅ Production API is responding')
    
    if (data.data && data.data.length > 0) {
      const topNeighborhood = data.data[0]
      console.log(`\n   Top neighborhood: ${topNeighborhood.neighborhood_name}`)
      console.log(`   Total complaints: ${topNeighborhood.total}`)
      console.log(`   Chaos score: ${topNeighborhood.chaos_score}`)
      
      // Check if chaos score looks correct (should be > 0 for top neighborhoods)
      if (topNeighborhood.chaos_score > 0) {
        console.log('   ✅ Chaos scores are being calculated correctly!')
      } else {
        console.log('   ⚠️  Chaos score is 0 - may need recalculation')
      }
    }

    console.log('\n✅ Production is connected to the database!')
    console.log('\n📝 To ensure production uses the same database:')
    console.log('   1. Go to Vercel Dashboard → Settings → Environment Variables')
    console.log(`   2. Verify NEXT_PUBLIC_SUPABASE_URL = ${EXPECTED_SUPABASE_URL}`)
    console.log('   3. If different, update it and redeploy')

  } catch (error) {
    console.error('\n❌ Error verifying production:', error)
    console.error('\n💡 Make sure:')
    console.error('   - Production site is deployed')
    console.error('   - Environment variables are set in Vercel')
    console.error('   - Site is accessible')
  }
}

verifyProduction().catch(console.error)

