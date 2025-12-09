import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { days = 30 } = body as { days?: number }

    console.log(`Backfilling daily aggregates for last ${days} days...`)

    // Use the range function if available, otherwise loop
    const { error: rangeError } = await supabase.rpc('refresh_daily_aggregates_range', {
      start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    })

    if (rangeError) {
      // Fallback: refresh one by one
      console.log('Range function not available, refreshing individually...')
      let refreshed = 0
      let errors = 0

      for (let i = 0; i < days; i++) {
        const targetDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dateStr = targetDate.toISOString().split('T')[0]
        
        const { error } = await supabase.rpc('refresh_daily_aggregates', {
          target_date: dateStr
        })
        
        if (error) {
          errors++
          if (i < 5) { // Log first few errors
            console.error(`Error refreshing ${dateStr}:`, error)
          }
        } else {
          refreshed++
        }
      }

      return NextResponse.json({
        success: true,
        message: `Backfilled daily aggregates`,
        stats: {
          days_requested: days,
          refreshed,
          errors
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled daily aggregates for last ${days} days`
    })

  } catch (error) {
    console.error('Backfill error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


