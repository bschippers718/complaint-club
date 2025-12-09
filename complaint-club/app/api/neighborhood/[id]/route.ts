import { NextRequest, NextResponse } from 'next/server'
import { getMockNeighborhoodDetail } from '@/lib/mock-data'

export const revalidate = 60 // Cache for 60 seconds

// Check if we have real Supabase config
const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Clean the ID - remove any whitespace, newlines, or invalid characters
  const cleanId = id.trim().replace(/[\s\n\r\t]/g, '')
  const neighborhoodId = parseInt(cleanId)

  if (isNaN(neighborhoodId) || neighborhoodId <= 0) {
    return NextResponse.json({
      data: null,
      error: 'Invalid neighborhood ID'
    }, { status: 400 })
  }

  // Use mock data if no real Supabase
  if (!hasSupabase) {
    const mockData = getMockNeighborhoodDetail(neighborhoodId)
    
    if (!mockData) {
      return NextResponse.json({
        data: null,
        error: 'Neighborhood not found'
      }, { status: 404 })
    }

    return NextResponse.json({ data: mockData })
  }

  // Real Supabase implementation
  try {
    const { createServiceClient } = await import('@/lib/supabase')
    const { getChaosDescriptor } = await import('@/lib/chaos-score')
    const supabase = createServiceClient()

    const { data: details, error: detailError } = await supabase.rpc('get_neighborhood_detail', {
      p_neighborhood_id: neighborhoodId
    })

    if (detailError) {
      throw detailError
    }

    if (!details || details.length === 0) {
      return NextResponse.json({
        data: null,
        error: 'Neighborhood not found'
      }, { status: 404 })
    }

    const { data: trends, error: trendError } = await supabase.rpc('get_neighborhood_trends', {
      p_neighborhood_id: neighborhoodId,
      p_days: 30
    })

    if (trendError) {
      console.error('Trend error:', trendError)
    }

    const stats: Record<string, {
      total: number
      rats: number
      noise: number
      parking: number
      trash: number
      heat_water: number
      other: number
      rank: number
    }> = {}

    for (const row of details) {
      stats[row.timeframe] = {
        total: row.total,
        rats: row.rats,
        noise: row.noise,
        parking: row.parking,
        trash: row.trash,
        heat_water: row.heat_water,
        other: row.other,
        rank: Number(row.rank_in_city)
      }
    }

    const info = details[0]
    const chaosDescriptor = getChaosDescriptor(info.chaos_score)

    const monthStats = stats['month'] || stats['all'] || { total: 0, rats: 0, noise: 0, parking: 0, trash: 0, heat_water: 0, other: 0, rank: 0 }
    const categories = [
      { name: 'rats', count: monthStats.rats },
      { name: 'noise', count: monthStats.noise },
      { name: 'parking', count: monthStats.parking },
      { name: 'trash', count: monthStats.trash },
      { name: 'heat_water', count: monthStats.heat_water },
      { name: 'other', count: monthStats.other }
    ].sort((a, b) => b.count - a.count)

    return NextResponse.json({
      data: {
        id: info.id,
        name: info.name,
        borough: info.borough,
        chaos_score: info.chaos_score,
        chaos_label: chaosDescriptor.label,
        chaos_emoji: chaosDescriptor.emoji,
        top_category: categories[0].name,
        top_category_count: categories[0].count,
        stats,
        trends: trends || [],
        insights: generateInsights(stats, info.name)
      }
    })

  } catch (error) {
    console.error('Neighborhood detail error:', error)
    return NextResponse.json({
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch neighborhood'
    }, { status: 500 })
  }
}

function generateInsights(stats: Record<string, { total: number; rats: number; noise: number; parking: number; trash: number; heat_water: number; other: number; rank: number }>, name: string): string[] {
  const insights: string[] = []
  const month = stats['month']
  const week = stats['week']
  
  if (!month) return insights

  if (month.rank <= 3) {
    insights.push(`🏆 ${name} is one of NYC's top 3 complaint hotspots!`)
  } else if (month.rank <= 10) {
    insights.push(`🔥 ${name} ranks #${month.rank} in NYC for complaints`)
  }

  const categories = [
    { name: 'Rats', count: month.rats },
    { name: 'Noise', count: month.noise },
    { name: 'Parking', count: month.parking },
    { name: 'Trash', count: month.trash },
    { name: 'Heat/Water', count: month.heat_water }
  ].sort((a, b) => b.count - a.count)

  if (categories[0].count > 0) {
    const topPct = Math.round((categories[0].count / month.total) * 100)
    insights.push(`${categories[0].name} complaints make up ${topPct}% of all issues`)
  }

  if (week && month.total > 0) {
    const weeklyAvg = month.total / 4
    if (week.total > weeklyAvg * 1.5) {
      insights.push(`📈 Complaints are up this week compared to the monthly average`)
    } else if (week.total < weeklyAvg * 0.5) {
      insights.push(`📉 Complaints are down this week - things are improving!`)
    }
  }

  if (month.rats > 100) {
    insights.push(`🐀 ${month.rats} rat sightings this month - watch your step!`)
  }

  return insights.slice(0, 4)
}
