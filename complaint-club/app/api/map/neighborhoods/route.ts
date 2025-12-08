import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { Timeframe } from '@/lib/categories'

export const revalidate = 300 // Cache for 5 minutes

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const timeframe = (searchParams.get('timeframe') || 'month') as Timeframe

  const supabase = createServiceClient()

  try {
    // Get neighborhoods with their polygon geometries and stats
    const { data, error } = await supabase.rpc('get_neighborhoods_geojson', {
      p_timeframe: timeframe
    })

    if (error) {
      // Fallback: fetch separately if RPC doesn't exist
      console.log('RPC not available, using fallback query')
      
      // Get neighborhoods
      const { data: neighborhoods, error: nError } = await supabase
        .from('neighborhoods')
        .select('id, name, borough, nta_code')
      
      if (nError) throw nError

      // Get stats
      const { data: stats, error: sError } = await supabase
        .from('aggregates_summary')
        .select('neighborhood_id, total, rats, noise, parking, trash, heat_water, other, chaos_score')
        .eq('timeframe', timeframe)

      if (sError) throw sError

      // Create a stats lookup
      const statsMap = new Map(stats?.map(s => [s.neighborhood_id, s]) || [])

      // Build GeoJSON (without actual geometries - we'll use a simplified approach)
      const features = (neighborhoods || []).map(n => {
        const stat = statsMap.get(n.id) || { 
          total: 0, rats: 0, noise: 0, parking: 0, 
          trash: 0, heat_water: 0, other: 0, chaos_score: 0 
        }
        
        return {
          type: 'Feature' as const,
          properties: {
            id: n.id,
            name: n.name,
            borough: n.borough,
            nta_code: n.nta_code,
            total: stat.total,
            rats: stat.rats,
            noise: stat.noise,
            parking: stat.parking,
            trash: stat.trash,
            heat_water: stat.heat_water,
            other: stat.other,
            chaos_score: stat.chaos_score
          },
          geometry: null // Will be filled by the RPC or external GeoJSON
        }
      })

      return NextResponse.json({
        type: 'FeatureCollection',
        features,
        meta: {
          timeframe,
          count: features.length,
          note: 'Geometries not included - use NYC Open Data GeoJSON'
        }
      })
    }

    // If RPC worked, return the full GeoJSON
    return NextResponse.json({
      type: 'FeatureCollection',
      features: data || [],
      meta: {
        timeframe,
        count: (data || []).length
      }
    })

  } catch (error) {
    console.error('Map neighborhoods error:', error)
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [],
      error: error instanceof Error ? error.message : 'Failed to fetch neighborhoods'
    }, { status: 500 })
  }
}

