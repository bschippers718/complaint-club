import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const maxDuration = 60 // Allow up to 60 seconds

export async function GET(request: NextRequest) {
  // Verify cron secret (trim to avoid Vercel env whitespace/newline issues)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET?.trim()

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const startTime = Date.now()

  try {
    console.log('Starting aggregation refresh...')

    // 1. Refresh daily aggregates for today, yesterday, and last 7 days
    // This ensures week data is accurate and trend data is reasonably up-to-date
    console.log('Refreshing daily aggregates...')
    const dailyErrors: string[] = []
    
    // Refresh daily aggregates for the last 7 days (for week accuracy and trend data)
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = targetDate.toISOString().split('T')[0]
      
      const { error } = await supabase.rpc('refresh_daily_aggregates', {
        target_date: dateStr
      })
      
      if (error && i < 2) { // Log errors for today and yesterday
        console.error(`Daily aggregate error for ${dateStr}:`, error)
        dailyErrors.push(`${dateStr}: ${error.message}`)
      }
    }
    
    const dailyError = dailyErrors.length > 0 ? new Error(dailyErrors.join('; ')) : null
    const yesterdayError = null // No longer separate

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
  const cronSecret = process.env.CRON_SECRET?.trim()

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

