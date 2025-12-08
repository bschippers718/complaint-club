import { NextRequest, NextResponse } from 'next/server'
import { MOCK_NEARBY_COMPLAINTS } from '@/lib/mock-data'

export const revalidate = 30 // Cache for 30 seconds

// Check if we have real Supabase config
const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const lat = parseFloat(searchParams.get('lat') || '')
  const lon = parseFloat(searchParams.get('lon') || '')
  const radius = Math.min(parseInt(searchParams.get('radius') || '500'), 2000)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({
      data: null,
      error: 'Valid latitude and longitude are required'
    }, { status: 400 })
  }

  // Use mock data if no real Supabase
  if (!hasSupabase) {
    // Filter by radius for mock data
    const filtered = MOCK_NEARBY_COMPLAINTS.filter(c => c.distance_meters <= radius).slice(0, limit)
    
    const categoryCounts: Record<string, number> = {}
    for (const c of filtered) {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1
    }

    const annoyanceScore = calculateAnnoyanceScore(filtered)

    return NextResponse.json({
      data: {
        complaints: filtered.map(c => ({
          id: c.id,
          category: c.category,
          type: c.type,
          description: c.description,
          created_at: c.created_at,
          distance_meters: c.distance_meters,
          neighborhood: c.neighborhood
        })),
        summary: {
          total: filtered.length,
          radius_meters: radius,
          annoyance_score: annoyanceScore,
          category_breakdown: categoryCounts
        },
        location: { lat, lon }
      }
    })
  }

  // Real Supabase implementation
  // Validate coordinates are within NYC bounds
  if (lat < 40.4 || lat > 41.0 || lon < -74.3 || lon > -73.6) {
    return NextResponse.json({
      data: null,
      error: 'Coordinates must be within New York City'
    }, { status: 400 })
  }

  try {
    const { createServiceClient } = await import('@/lib/supabase')
    const supabase = createServiceClient()

    const { data: complaints, error } = await supabase.rpc('get_nearby_complaints', {
      p_latitude: lat,
      p_longitude: lon,
      p_radius_meters: radius,
      p_limit: limit
    })

    if (error) {
      throw error
    }

    const annoyanceScore = calculateAnnoyanceScore(complaints || [])

    const categoryCounts: Record<string, number> = {}
    for (const c of complaints || []) {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1
    }

    return NextResponse.json({
      data: {
        complaints: (complaints || []).map((c: {
          id: string
          category: string
          complaint_type: string
          descriptor: string
          created_at: string
          distance_meters: number
          neighborhood_name: string
        }) => ({
          id: c.id,
          category: c.category,
          type: c.complaint_type,
          description: c.descriptor,
          created_at: c.created_at,
          distance_meters: Math.round(c.distance_meters),
          neighborhood: c.neighborhood_name
        })),
        summary: {
          total: (complaints || []).length,
          radius_meters: radius,
          annoyance_score: annoyanceScore,
          category_breakdown: categoryCounts
        },
        location: { lat, lon }
      }
    })

  } catch (error) {
    console.error('Nearby error:', error)
    return NextResponse.json({
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch nearby complaints'
    }, { status: 500 })
  }
}

function calculateAnnoyanceScore(complaints: { category: string; distance_meters: number; created_at: string }[]): number {
  if (complaints.length === 0) return 0

  const categoryWeights: Record<string, number> = {
    noise: 1.5,
    rats: 1.3,
    trash: 1.2,
    parking: 1.0,
    heat_water: 0.8,
    other: 0.7
  }

  let score = 0
  const now = Date.now()

  for (const complaint of complaints) {
    const distanceFactor = Math.max(0.1, 1 - (complaint.distance_meters / 500))
    const age = now - new Date(complaint.created_at).getTime()
    const daysSince = age / (1000 * 60 * 60 * 24)
    const recencyFactor = Math.max(0.1, 1 - (daysSince / 30))
    const categoryWeight = categoryWeights[complaint.category] || 1
    
    score += distanceFactor * recencyFactor * categoryWeight * 10
  }

  return Math.min(100, Math.round(score))
}
