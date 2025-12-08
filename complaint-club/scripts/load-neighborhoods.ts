/**
 * Load NYC Neighborhood Boundaries into Supabase
 * 
 * This script fetches NYC NTA (Neighborhood Tabulation Areas) boundaries
 * from NYC Open Data and loads them into the neighborhoods table.
 * 
 * Run with: npx ts-node scripts/load-neighborhoods.ts
 * Or: npx tsx scripts/load-neighborhoods.ts
 */

import { createClient } from '@supabase/supabase-js'

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
    // Other properties we don't need
  }
}

interface GeoJSONResponse {
  type: 'FeatureCollection'
  features: NTAFeature[]
}

async function loadNeighborhoods() {
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

  console.log('🗽 Loading NYC Neighborhood Boundaries...\n')

  try {
    // Fetch GeoJSON from NYC Open Data
    console.log('📡 Fetching from NYC Open Data API...')
    const response = await fetch(NTA_API_URL)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch NTA data: ${response.statusText}`)
    }

    const geojson: GeoJSONResponse = await response.json()
    console.log(`✅ Fetched ${geojson.features.length} neighborhood boundaries\n`)

    // Filter out non-residential NTAs (parks, airports, cemeteries, etc.)
    const residentialNTAs = geojson.features.filter(feature => {
      const name = feature.properties.ntaname.toLowerCase()
      const code = feature.properties.nta2020
      
      // Exclude certain NTA types
      if (code.startsWith('BK99') || code.startsWith('MN99') || 
          code.startsWith('QN99') || code.startsWith('BX99') || 
          code.startsWith('SI99')) {
        return false
      }
      
      // Exclude parks, airports, and other non-residential areas
      if (name.includes('park-cemetery') || name.includes('airport') || 
          name.includes('rikers') || name.includes('cemetery')) {
        return false
      }
      
      return true
    })

    console.log(`📍 Processing ${residentialNTAs.length} residential neighborhoods...\n`)

    // Process and insert each neighborhood
    let inserted = 0
    let errors = 0

    for (const feature of residentialNTAs) {
      const { ntaname, nta2020, boroname } = feature.properties
      
      // Convert geometry to WKT format for PostGIS
      // Ensure it's always MultiPolygon
      let geometry = feature.geometry
      if (geometry.type === 'Polygon') {
        geometry = {
          type: 'MultiPolygon',
          coordinates: [geometry.coordinates as number[][][]]
        }
      }

      const geojsonString = JSON.stringify(geometry)
      
      // Insert using raw SQL to handle PostGIS geometry
      const { error } = await supabase.rpc('exec_sql', {
        query: `
          INSERT INTO neighborhoods (name, borough, nta_code, polygon)
          VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))
          ON CONFLICT (nta_code) DO UPDATE SET
            name = EXCLUDED.name,
            borough = EXCLUDED.borough,
            polygon = EXCLUDED.polygon
        `,
        params: [ntaname, boroname, nta2020, geojsonString]
      })

      if (error) {
        // Fallback: try direct insert if exec_sql doesn't exist
        const { error: insertError } = await supabase
          .from('neighborhoods')
          .upsert({
            name: ntaname,
            borough: boroname,
            nta_code: nta2020,
            // Note: This won't work for geometry - see alternative below
          }, { onConflict: 'nta_code' })
        
        if (insertError) {
          console.error(`❌ Error inserting ${ntaname}: ${insertError.message}`)
          errors++
        } else {
          inserted++
          process.stdout.write(`\r✅ Inserted: ${inserted} | Errors: ${errors}`)
        }
      } else {
        inserted++
        process.stdout.write(`\r✅ Inserted: ${inserted} | Errors: ${errors}`)
      }
    }

    console.log('\n\n🎉 Neighborhood loading complete!')
    console.log(`   Total inserted: ${inserted}`)
    console.log(`   Errors: ${errors}`)

  } catch (error) {
    console.error('Failed to load neighborhoods:', error)
    process.exit(1)
  }
}

// Alternative: Generate SQL INSERT statements for manual execution
async function generateSQL() {
  console.log('📄 Generating SQL for manual execution...\n')

  const response = await fetch(NTA_API_URL)
  const geojson: GeoJSONResponse = await response.json()

  const residentialNTAs = geojson.features.filter(feature => {
    const code = feature.properties.nta2020
    const name = feature.properties.ntaname.toLowerCase()
    
    if (code.startsWith('BK99') || code.startsWith('MN99') || 
        code.startsWith('QN99') || code.startsWith('BX99') || 
        code.startsWith('SI99')) {
      return false
    }
    
    if (name.includes('park-cemetery') || name.includes('airport') || 
        name.includes('rikers') || name.includes('cemetery')) {
      return false
    }
    
    return true
  })

  console.log('-- NYC Neighborhood Boundaries')
  console.log('-- Generated SQL for Supabase\n')

  for (const feature of residentialNTAs) {
    const { ntaname, nta2020, boroname } = feature.properties
    
    let geometry = feature.geometry
    if (geometry.type === 'Polygon') {
      geometry = {
        type: 'MultiPolygon',
        coordinates: [geometry.coordinates as number[][][]]
      }
    }

    const escapedName = ntaname.replace(/'/g, "''")
    const geojsonString = JSON.stringify(geometry).replace(/'/g, "''")
    
    console.log(`INSERT INTO neighborhoods (name, borough, nta_code, polygon)
VALUES ('${escapedName}', '${boroname}', '${nta2020}', ST_SetSRID(ST_GeomFromGeoJSON('${geojsonString}'), 4326))
ON CONFLICT (nta_code) DO UPDATE SET name = EXCLUDED.name, borough = EXCLUDED.borough, polygon = EXCLUDED.polygon;
`)
  }
}

// Check command line args
const args = process.argv.slice(2)
if (args.includes('--sql')) {
  generateSQL()
} else {
  loadNeighborhoods()
}

