/**
 * Analyze complaints in the "other" category
 * 
 * This script queries the database to see what complaint types are
 * currently categorized as "other" and helps identify which categories
 * they should belong to.
 * 
 * Run with: npx tsx scripts/analyze-other-category.ts
 */

import { createClient } from '@supabase/supabase-js'

async function analyzeOtherCategory() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables:')
    console.error('- NEXT_PUBLIC_SUPABASE_URL')
    console.error('- SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nMake sure you have a .env.local file with these values.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log('🔍 Analyzing "other" category complaints...\n')

  try {
    // Get all complaints categorized as "other"
    const { data: otherComplaints, error } = await supabase
      .from('complaints')
      .select('complaint_type, descriptor')
      .eq('category', 'other')
      .limit(10000) // Get a good sample

    if (error) throw error

    if (!otherComplaints || otherComplaints.length === 0) {
      console.log('✅ No complaints found in "other" category!')
      return
    }

    console.log(`📊 Found ${otherComplaints.length} complaints in "other" category\n`)

    // Group by complaint_type and count
    const typeCounts: Record<string, { count: number; sampleDescriptors: string[] }> = {}
    
    for (const complaint of otherComplaints) {
      const type = complaint.complaint_type || 'Unknown'
      if (!typeCounts[type]) {
        typeCounts[type] = { count: 0, sampleDescriptors: [] }
      }
      typeCounts[type].count++
      if (complaint.descriptor && typeCounts[type].sampleDescriptors.length < 5) {
        typeCounts[type].sampleDescriptors.push(complaint.descriptor)
      }
    }

    // Sort by count descending
    const sortedTypes = Object.entries(typeCounts)
      .map(([type, data]) => ({
        complaint_type: type,
        count: data.count,
        sample_descriptors: data.sampleDescriptors
      }))
      .sort((a, b) => b.count - a.count)

    console.log(`📋 Found ${sortedTypes.length} unique complaint types in "other" category\n`)
    console.log('=' .repeat(80))
    console.log('TOP 20 COMPLAINT TYPES IN "OTHER" CATEGORY:')
    console.log('=' .repeat(80))
    console.log()

    sortedTypes.slice(0, 20).forEach((item, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${item.complaint_type}`)
      console.log(`    Count: ${item.count.toLocaleString()}`)
      if (item.sample_descriptors.length > 0) {
        console.log(`    Sample descriptors:`)
        item.sample_descriptors.forEach(desc => {
          console.log(`      - ${desc}`)
        })
      }
      console.log()
    })

    console.log('=' .repeat(80))
    console.log('\n💡 Suggestions for category mapping:')
    console.log('=' .repeat(80))
    console.log()

    // Analyze each type and suggest a category
    const suggestions: Record<string, string[]> = {
      rats: [],
      noise: [],
      parking: [],
      trash: [],
      heat_water: []
    }

    sortedTypes.forEach(item => {
      const type = item.complaint_type.toLowerCase()
      
      // Check if it should be rats
      if (type.includes('rodent') || type.includes('rat') || type.includes('mouse') || type.includes('mice')) {
        suggestions.rats.push(item.complaint_type)
        return
      }
      
      // Check if it should be noise
      if (type.includes('noise') || type.includes('loud') || type.includes('music') || type.includes('construction')) {
        suggestions.noise.push(item.complaint_type)
        return
      }
      
      // Check if it should be parking
      if (type.includes('parking') || type.includes('vehicle') || type.includes('blocked') || type.includes('hydrant')) {
        suggestions.parking.push(item.complaint_type)
        return
      }
      
      // Check if it should be trash
      if (type.includes('sanitation') || type.includes('trash') || type.includes('garbage') || 
          type.includes('litter') || type.includes('dirty') || type.includes('graffiti') ||
          type.includes('unsanitary') || type.includes('dumping') || type.includes('illegal dump') ||
          type.includes('missed collection') || type.includes('derelict') || type.includes('abandoned') ||
          type.includes('dead animal') || type.includes('street condition') || type.includes('overflowing') ||
          type.includes('receptacle') || type.includes('sidewalk') || type.includes('dumpster')) {
        suggestions.trash.push(item.complaint_type)
        return
      }
      
      // Check if it should be heat_water
      if (type.includes('heat') || type.includes('hot water') || type.includes('water system') ||
          type.includes('water leak') || type.includes('plumbing') || type.includes('boiler') ||
          type.includes('radiator') || type.includes('no heat') || type.includes('sewer') ||
          type.includes('catch basin') || type.includes('gas') || type.includes('electric')) {
        suggestions.heat_water.push(item.complaint_type)
        return
      }
    })

    Object.entries(suggestions).forEach(([category, types]) => {
      if (types.length > 0) {
        console.log(`\n${category.toUpperCase()}:`)
        types.forEach(type => {
          const count = sortedTypes.find(t => t.complaint_type === type)?.count || 0
          console.log(`  - "${type}" (${count.toLocaleString()} complaints)`)
        })
      }
    })

    console.log('\n' + '=' .repeat(80))
    console.log('\n📈 Summary:')
    console.log(`   Total "other" complaints: ${otherComplaints.length.toLocaleString()}`)
    console.log(`   Unique types: ${sortedTypes.length}`)
    console.log(`   Top type: "${sortedTypes[0]?.complaint_type}" (${sortedTypes[0]?.count.toLocaleString()} complaints)`)
    console.log()

  } catch (error) {
    console.error('❌ Failed to analyze other category:', error)
    process.exit(1)
  }
}

analyzeOtherCategory()


