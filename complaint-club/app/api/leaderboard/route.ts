import { NextRequest, NextResponse } from 'next/server'
import type { Category, Timeframe } from '@/lib/categories'

export const revalidate = 60 // Cache for 60 seconds

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const category = (searchParams.get('category') || 'all') as Category | 'all'
  const timeframe = (searchParams.get('timeframe') || 'month') as Timeframe
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  // Require Supabase configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
    return NextResponse.json({
      data: null,
      error: 'Supabase configuration is required. Please set NEXT_PUBLIC_SUPABASE_URL environment variable.'
    }, { status: 500 })
  }

  // Supabase implementation
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
