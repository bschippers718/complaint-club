import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const VALID_CATEGORIES = ['noise', 'rats', 'trash', 'parking', 'heat_water', 'building', 'other']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, lat, lon, sessionId } = body

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({
        success: false,
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      }, { status: 400 })
    }

    // Validate coordinates
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Valid latitude and longitude are required'
      }, { status: 400 })
    }

    // Validate coordinates are within NYC bounds
    if (lat < 40.4 || lat > 41.0 || lon < -74.3 || lon > -73.6) {
      return NextResponse.json({
        success: false,
        error: 'Coordinates must be within New York City'
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Insert the report
    const { data, error } = await supabase
      .from('user_reports')
      .insert({
        category,
        latitude: lat,
        longitude: lon,
        session_id: sessionId || null
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error inserting report:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to save report'
      }, { status: 500 })
    }

    // Get updated count for this category nearby
    const { data: counts, error: countError } = await supabase.rpc('get_nearby_user_reports', {
      p_latitude: lat,
      p_longitude: lon,
      p_radius_meters: 500
    })

    const categoryCount = counts?.find((c: { category: string; report_count: number }) => c.category === category)?.report_count || 1

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        category,
        nearbyCount: categoryCount
      }
    })

  } catch (error) {
    console.error('Report error:', error)
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred'
    }, { status: 500 })
  }
}

// GET endpoint to fetch nearby user report counts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const lat = parseFloat(searchParams.get('lat') || '')
  const lon = parseFloat(searchParams.get('lon') || '')
  const radius = Math.min(parseInt(searchParams.get('radius') || '500'), 2000)

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({
      success: false,
      error: 'Valid latitude and longitude are required'
    }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    const { data: counts, error } = await supabase.rpc('get_nearby_user_reports', {
      p_latitude: lat,
      p_longitude: lon,
      p_radius_meters: radius
    })

    if (error) {
      throw error
    }

    // Convert to object for easier access
    const countsByCategory: Record<string, number> = {}
    for (const row of counts || []) {
      countsByCategory[row.category] = row.report_count
    }

    return NextResponse.json({
      success: true,
      data: {
        counts: countsByCategory,
        radius
      }
    })

  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch report counts'
    }, { status: 500 })
  }
}
