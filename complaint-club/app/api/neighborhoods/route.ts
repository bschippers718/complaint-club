import { NextRequest, NextResponse } from 'next/server'
import { MOCK_NEIGHBORHOODS } from '@/lib/mock-data'

export const revalidate = 3600 // Cache for 1 hour

// Check if we have real Supabase config
const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const borough = searchParams.get('borough')
  const search = searchParams.get('search')

  // Use mock data if no real Supabase
  if (!hasSupabase) {
    let data = [...MOCK_NEIGHBORHOODS]
    
    if (borough) {
      data = data.filter(n => n.borough === borough)
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      data = data.filter(n => n.name.toLowerCase().includes(searchLower))
    }

    const byBorough: Record<string, { id: number; name: string }[]> = {}
    for (const n of data) {
      if (!byBorough[n.borough]) {
        byBorough[n.borough] = []
      }
      byBorough[n.borough].push({ id: n.id, name: n.name })
    }

    return NextResponse.json({
      data: {
        neighborhoods: data,
        by_borough: byBorough,
        boroughs: Object.keys(byBorough).sort()
      }
    })
  }

  // Real Supabase implementation
  try {
    const { createServiceClient } = await import('@/lib/supabase')
    const supabase = createServiceClient()

    let query = supabase
      .from('neighborhoods')
      .select('id, name, borough')
      .order('name')

    if (borough) {
      query = query.eq('borough', borough)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    const byBorough: Record<string, { id: number; name: string }[]> = {}
    
    for (const n of data || []) {
      if (!byBorough[n.borough]) {
        byBorough[n.borough] = []
      }
      byBorough[n.borough].push({ id: n.id, name: n.name })
    }

    return NextResponse.json({
      data: {
        neighborhoods: data || [],
        by_borough: byBorough,
        boroughs: Object.keys(byBorough).sort()
      }
    })

  } catch (error) {
    console.error('Neighborhoods list error:', error)
    return NextResponse.json({
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch neighborhoods'
    }, { status: 500 })
  }
}
