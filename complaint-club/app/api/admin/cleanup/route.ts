import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const maxDuration = 300 // 5 minutes

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

  const body = await request.json().catch(() => ({}))
  const { action, lat_min, lat_max, batch_size = 5000 } = body

  try {
    if (action === 'count') {
      // Count records to delete
      const { count, error } = await supabase
        .from('complaints')
        .select('id', { count: 'exact', head: true })
        .gt('latitude', lat_min)
        .lt('latitude', lat_max)

      if (error) throw error
      return NextResponse.json({ count })
    }

    if (action === 'delete') {
      // Delete in batches
      let totalDeleted = 0
      let batchCount = 0
      const maxBatches = 50 // Safety limit

      while (batchCount < maxBatches) {
        // Get batch of IDs to delete
        const { data: toDelete, error: selectError } = await supabase
          .from('complaints')
          .select('id')
          .gt('latitude', lat_min)
          .lt('latitude', lat_max)
          .limit(batch_size)

        if (selectError) throw selectError
        if (!toDelete || toDelete.length === 0) break

        const ids = toDelete.map(r => r.id)

        // Delete batch
        const { error: deleteError } = await supabase
          .from('complaints')
          .delete()
          .in('id', ids)

        if (deleteError) throw deleteError

        totalDeleted += ids.length
        batchCount++
        console.log(`Deleted batch ${batchCount}: ${ids.length} records (total: ${totalDeleted})`)
      }

      return NextResponse.json({ 
        success: true, 
        deleted: totalDeleted,
        batches: batchCount
      })
    }

    if (action === 'aggregate') {
      // Re-run aggregation
      const { error: summaryError } = await supabase.rpc('refresh_summary_aggregates')
      if (summaryError) throw summaryError

      const { error: chaosError } = await supabase.rpc('update_chaos_scores')
      if (chaosError) throw chaosError

      return NextResponse.json({ success: true, message: 'Aggregation complete' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

