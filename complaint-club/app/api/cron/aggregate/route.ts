import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const maxDuration = 60 // Allow up to 60 seconds

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const startTime = Date.now()

  try {
    console.log('Starting aggregation refresh...')

    // 1. Refresh daily aggregates for today and yesterday
    console.log('Refreshing daily aggregates...')
    const { error: dailyError } = await supabase.rpc('refresh_daily_aggregates')
    if (dailyError) {
      console.error('Daily aggregate error:', dailyError)
    }

    // Also refresh yesterday's
    const { error: yesterdayError } = await supabase.rpc('refresh_daily_aggregates', {
      target_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    if (yesterdayError) {
      console.error('Yesterday aggregate error:', yesterdayError)
    }

    // 2. Refresh summary aggregates (today, week, month, all)
    console.log('Refreshing summary aggregates...')
    const { error: summaryError } = await supabase.rpc('refresh_summary_aggregates')
    if (summaryError) {
      console.error('Summary aggregate error:', summaryError)
    }

    // 3. Update chaos scores
    console.log('Updating chaos scores...')
    const { error: chaosError } = await supabase.rpc('update_chaos_scores')
    if (chaosError) {
      console.error('Chaos score error:', chaosError)
    }

    const duration = Date.now() - startTime
    console.log(`Aggregation complete in ${duration}ms`)

    // Get some stats
    const { count: neighborhoodCount } = await supabase
      .from('neighborhoods')
      .select('*', { count: 'exact', head: true })

    const { count: complaintCount } = await supabase
      .from('complaints')
      .select('*', { count: 'exact', head: true })

    const { data: topNeighborhood } = await supabase
      .from('aggregates_summary')
      .select('neighborhood_id, total, chaos_score')
      .eq('timeframe', 'month')
      .order('total', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Aggregation refresh complete',
      stats: {
        duration_ms: duration,
        neighborhoods: neighborhoodCount,
        total_complaints: complaintCount,
        top_neighborhood_complaints: topNeighborhood?.total || 0,
        max_chaos_score: topNeighborhood?.chaos_score || 0
      },
      errors: {
        daily: dailyError?.message,
        yesterday: yesterdayError?.message,
        summary: summaryError?.message,
        chaos: chaosError?.message
      }
    })

  } catch (error) {
    console.error('Aggregation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Manual trigger with full refresh option
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    console.log('Running full aggregation refresh...')

    // Use the convenience function that does everything
    const { error } = await supabase.rpc('full_aggregation_refresh')
    
    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Full aggregation refresh complete'
    })

  } catch (error) {
    console.error('Full aggregation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

