import { NextRequest, NextResponse } from 'next/server'
import type { Category, Timeframe } from '@/lib/categories'
import { CATEGORIES } from '@/lib/categories'

export const revalidate = 60

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const leftId = parseInt(searchParams.get('left') || '')
  const rightId = parseInt(searchParams.get('right') || '')
  const timeframe = (searchParams.get('timeframe') || 'month') as Timeframe

  if (isNaN(leftId) || isNaN(rightId)) {
    return NextResponse.json({
      data: null,
      error: 'Both left and right neighborhood IDs are required'
    }, { status: 400 })
  }

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

    const [leftResult, rightResult] = await Promise.all([
      supabase.rpc('get_neighborhood_detail', { p_neighborhood_id: leftId }),
      supabase.rpc('get_neighborhood_detail', { p_neighborhood_id: rightId })
    ])

    if (leftResult.error) throw leftResult.error
    if (rightResult.error) throw rightResult.error

    const leftData = (leftResult.data || []).find(
      (d: { timeframe: string }) => d.timeframe === timeframe
    )
    const rightData = (rightResult.data || []).find(
      (d: { timeframe: string }) => d.timeframe === timeframe
    )

    if (!leftData || !rightData) {
      return NextResponse.json({
        data: null,
        error: 'One or both neighborhoods not found'
      }, { status: 404 })
    }

    const categoryWinners: Record<Category, 'left' | 'right' | 'tie'> = {} as Record<Category, 'left' | 'right' | 'tie'>
    
    for (const cat of CATEGORIES) {
      const leftCount = leftData[cat] as number
      const rightCount = rightData[cat] as number
      
      if (leftCount > rightCount) {
        categoryWinners[cat] = 'left'
      } else if (rightCount > leftCount) {
        categoryWinners[cat] = 'right'
      } else {
        categoryWinners[cat] = 'tie'
      }
    }

    let overallWinner: 'left' | 'right' | 'tie'
    if (leftData.total > rightData.total) {
      overallWinner = 'left'
    } else if (rightData.total > leftData.total) {
      overallWinner = 'right'
    } else {
      overallWinner = 'tie'
    }

    return NextResponse.json({
      data: {
        left: {
          id: leftData.id,
          name: leftData.name,
          borough: leftData.borough,
          total: leftData.total,
          chaos_score: leftData.chaos_score,
          rank: leftData.rank_in_city,
          category_counts: {
            rats: leftData.rats,
            noise: leftData.noise,
            parking: leftData.parking,
            trash: leftData.trash,
            heat_water: leftData.heat_water,
            other: leftData.other
          }
        },
        right: {
          id: rightData.id,
          name: rightData.name,
          borough: rightData.borough,
          total: rightData.total,
          chaos_score: rightData.chaos_score,
          rank: rightData.rank_in_city,
          category_counts: {
            rats: rightData.rats,
            noise: rightData.noise,
            parking: rightData.parking,
            trash: rightData.trash,
            heat_water: rightData.heat_water,
            other: rightData.other
          }
        },
        winner: overallWinner,
        category_winners: categoryWinners,
        timeframe
      }
    })

  } catch (error) {
    console.error('Compare error:', error)
    return NextResponse.json({
      data: null,
      error: error instanceof Error ? error.message : 'Failed to compare neighborhoods'
    }, { status: 500 })
  }
}
