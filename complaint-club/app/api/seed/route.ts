import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// NYC Open Data API for NTA boundaries (2020)
const NTA_API_URL = 'https://data.cityofnewyork.us/resource/9nt8-h7nd.geojson'

interface NTAFeature {
  type: 'Feature'
  geometry: {
    type: 'MultiPolygon' | 'Polygon'
    coordinates: number[][][] | number[][][][]
  }
  properties: {
    ntaname: string
    nta2020: string
    boroname: string
  }
}

interface GeoJSONResponse {
  type: 'FeatureCollection'
  features: NTAFeature[]
}

export async function POST(request: NextRequest) {
  // Verify secret key for protection
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    console.log('Fetching NYC neighborhood boundaries...')
    
    // Fetch GeoJSON from NYC Open Data
    const response = await fetch(NTA_API_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch NTA data: ${response.statusText}`)
    }

    const geojson: GeoJSONResponse = await response.json()
    
    // Filter out non-residential NTAs
    const residentialNTAs = geojson.features.filter(feature => {
      const code = feature.properties.nta2020
      const name = feature.properties.ntaname.toLowerCase()
      
      // Exclude park/cemetery/airport NTAs
      if (code.endsWith('99') || code.endsWith('98')) return false
      if (name.includes('park-cemetery') || name.includes('airport') || 
          name.includes('rikers') || name.includes('cemetery')) {
        return false
      }
      
      return true
    })

    console.log(`Processing ${residentialNTAs.length} neighborhoods...`)

    let inserted = 0
    let errors = 0
    const errorDetails: string[] = []

    // Process in batches
    for (const feature of residentialNTAs) {
      const { ntaname, nta2020, boroname } = feature.properties
      
      // Ensure MultiPolygon format
      let geometry = feature.geometry
      if (geometry.type === 'Polygon') {
        geometry = {
          type: 'MultiPolygon',
          coordinates: [geometry.coordinates as number[][][]]
        }
      }

      const geojsonString = JSON.stringify(geometry)
      const escapedName = ntaname.replace(/'/g, "''")
      
      // Use raw SQL to insert with PostGIS geometry
      const { error } = await supabase.rpc('insert_neighborhood', {
        p_name: escapedName,
        p_borough: boroname,
        p_nta_code: nta2020,
        p_geojson: geojsonString
      })

      if (error) {
        // Try direct SQL via edge function or fallback
        const { error: sqlError } = await supabase
          .from('neighborhoods')
          .upsert({
            name: ntaname,
            borough: boroname,
            nta_code: nta2020
          }, { onConflict: 'nta_code' })
        
        if (sqlError) {
          errors++
          errorDetails.push(`${ntaname}: ${sqlError.message}`)
        } else {
          inserted++
        }
      } else {
        inserted++
      }
    }

    // Refresh aggregates summary for new neighborhoods
    await supabase.rpc('refresh_summary_aggregates')

    return NextResponse.json({
      success: true,
      message: 'Neighborhood seeding complete',
      stats: {
        total_fetched: geojson.features.length,
        residential_filtered: residentialNTAs.length,
        inserted,
        errors,
        errorDetails: errorDetails.slice(0, 10) // First 10 errors
      }
    })

  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/seed',
    method: 'POST',
    description: 'Seeds NYC neighborhood boundaries from NYC Open Data',
    auth: 'Bearer token required (CRON_SECRET)'
  })
}

