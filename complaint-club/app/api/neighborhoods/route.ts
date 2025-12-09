import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600 // Cache for 1 hour

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const borough = searchParams.get('borough')
  const search = searchParams.get('search')

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

    // Build query - explicitly request all neighborhoods (there are ~250)
    // Supabase's default limit is 1000, so we'll set it to ensure we get everything
    let query = supabase
      .from('neighborhoods')
      .select('id, name, borough', { count: 'exact' })
      .order('name', { ascending: true })
      .limit(1000) // Explicitly set limit to ensure we get all ~250 neighborhoods

    if (borough) {
      query = query.eq('borough', borough)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase neighborhoods query error:', error)
      throw error
    }

    // Log for debugging - helps identify if we're missing neighborhoods
    if (process.env.NODE_ENV === 'development' && data) {
      console.log(`[Neighborhoods API] Fetched ${data.length} neighborhoods${count ? ` (total available: ${count})` : ''}`)
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
