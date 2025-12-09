import { NextRequest, NextResponse } from 'next/server'
import { MOCK_LEADERBOARD } from '@/lib/mock-data'
import type { Category, Timeframe } from '@/lib/categories'

export const revalidate = 60 // Cache for 60 seconds

// Check if we have real Supabase config
const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const category = (searchParams.get('category') || 'all') as Category | 'all'
  const timeframe = (searchParams.get('timeframe') || 'month') as Timeframe
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  // Use mock data if no real Supabase
  if (!hasSupabase) {
    let data = [...MOCK_LEADERBOARD]
    
    // Filter by category if needed
    if (category !== 'all') {
      data = data.sort((a, b) => {
        const aCount = a.category_counts[category] || 0
        const bCount = b.category_counts[category] || 0
        return bCount - aCount
      }).map((entry, index) => ({ ...entry, rank: index + 1 }))
    }

    // Apply timeframe scaling for demo purposes
    const timeframeFactors: Record<Timeframe, number> = {
      today: 0.03,
      week: 0.25,
      month: 1,
      all: 12
    }
    const factor = timeframeFactors[timeframe]

    const scaledData = data.slice(0, limit).map(entry => ({
      ...entry,
      total: Math.round(entry.total * factor),
      category_counts: {
        rats: Math.round((entry.category_counts.rats || 0) * factor),
        noise: Math.round((entry.category_counts.noise || 0) * factor),
        parking: Math.round((entry.category_counts.parking || 0) * factor),
        trash: Math.round((entry.category_counts.trash || 0) * factor),
        heat_water: Math.round((entry.category_counts.heat_water || 0) * factor),
        construction: Math.round((entry.category_counts.construction || 0) * factor),
        building: Math.round((entry.category_counts.building || 0) * factor),
        bikes: Math.round((entry.category_counts.bikes || 0) * factor),
        other: Math.round((entry.category_counts.other || 0) * factor)
      }
    }))

    return NextResponse.json({
      data: scaledData,
      meta: {
        category,
        timeframe,
        count: scaledData.length,
        updated_at: new Date().toISOString(),
        demo_mode: true
      }
    })
  }

  // Real Supabase implementation
  try {
    const { createServiceClient } = await import('@/lib/supabase')
    const supabase = createServiceClient()

    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_timeframe: timeframe,
      p_category: category,
      p_limit: limit
    })

    if (error) {
      throw error
    }

    const leaderboard = (data || []).map((row: {
      rank: number
      neighborhood_id: number
      neighborhood_name: string
      borough: string
      total: number
      rats: number
      noise: number
      parking: number
      trash: number
      heat_water: number
      construction?: number
      building?: number
      bikes?: number
      other: number
      chaos_score: number
    }) => ({
      rank: row.rank,
      neighborhood_id: row.neighborhood_id,
      neighborhood_name: row.neighborhood_name,
      borough: row.borough,
      total: row.total,
      chaos_score: row.chaos_score,
      category_counts: {
        rats: row.rats,
        noise: row.noise,
        parking: row.parking,
        trash: row.trash,
        heat_water: row.heat_water,
        construction: row.construction || 0,
        building: row.building || 0,
        bikes: row.bikes || 0,
        other: row.other
      }
    }))

    return NextResponse.json({
      data: leaderboard,
      meta: {
        category,
        timeframe,
        count: leaderboard.length,
        updated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch leaderboard'
    }, { status: 500 })
  }
}
