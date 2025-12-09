import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { mapComplaintTypeToCategory } from '@/lib/categories'

// Admin endpoint to apply new categories migration
// This recategorizes existing complaints and triggers aggregation refresh

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'complaint-club-admin-2024'

export async function POST(request: NextRequest) {
  // Check authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const results: string[] = []

  try {
    // Step 1: Get all unique complaint types from the database
    console.log('Fetching unique complaint types...')
    const { data: complaintTypes, error: typesError } = await supabase
      .from('complaints')
      .select('complaint_type')
      .not('complaint_type', 'is', null)
      .limit(10000)

    if (typesError) {
      throw new Error(`Failed to fetch complaint types: ${typesError.message}`)
    }

    // Get unique types
    const uniqueTypes = [...new Set(complaintTypes?.map(c => c.complaint_type) || [])]
    results.push(`Found ${uniqueTypes.length} unique complaint types`)

    // Step 2: Build category mapping
    const categoryMapping: Record<string, string> = {}
    for (const type of uniqueTypes) {
      if (type) {
        categoryMapping[type] = mapComplaintTypeToCategory(type)
      }
    }

    // Count new categories
    const newCategoryCounts = {
      construction: 0,
      building: 0,
      bikes: 0
    }
    
    for (const [type, category] of Object.entries(categoryMapping)) {
      if (category === 'construction') newCategoryCounts.construction++
      if (category === 'building') newCategoryCounts.building++
      if (category === 'bikes') newCategoryCounts.bikes++
    }

    results.push(`New category mappings: Construction=${newCategoryCounts.construction}, Building=${newCategoryCounts.building}, Bikes=${newCategoryCounts.bikes}`)

    // Step 3: Update complaints in batches by complaint_type
    let updated = 0
    for (const [complaintType, newCategory] of Object.entries(categoryMapping)) {
      // Only update if the new category is different from what would be 'other' or a new category
      if (['construction', 'building', 'bikes'].includes(newCategory)) {
        const { error: updateError } = await supabase
          .from('complaints')
          .update({ category: newCategory })
          .eq('complaint_type', complaintType)

        if (updateError) {
          console.error(`Error updating ${complaintType}:`, updateError)
        } else {
          updated += 1
        }
      }
    }

    results.push(`Updated ${updated} complaints to new categories`)

    // Step 4: Trigger aggregation refresh
    console.log('Refreshing aggregates...')
    
    // Refresh daily aggregates for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    
    const { error: dailyError } = await supabase.rpc('refresh_daily_aggregates_range', {
      start_date: thirtyDaysAgo,
      end_date: today
    })
    
    if (dailyError) {
      results.push(`Warning: Daily aggregates refresh failed: ${dailyError.message}`)
    } else {
      results.push('Refreshed daily aggregates for last 30 days')
    }

    // Refresh summary aggregates
    const { error: summaryError } = await supabase.rpc('refresh_summary_aggregates')
    if (summaryError) {
      results.push(`Warning: Summary aggregates refresh failed: ${summaryError.message}`)
    } else {
      results.push('Refreshed summary aggregates')
    }

    // Update chaos scores
    const { error: chaosError } = await supabase.rpc('update_chaos_scores')
    if (chaosError) {
      results.push(`Warning: Chaos scores update failed: ${chaosError.message}`)
    } else {
      results.push('Updated chaos scores')
    }

    return NextResponse.json({
      success: true,
      message: 'New categories applied successfully',
      results,
      note: 'NOTE: You still need to run the SQL migration (008_add_new_categories.sql) in Supabase SQL Editor to add the new columns to aggregates_summary table first!'
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 })
  }
}

