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
    // Get actual max values from current data
    const { data: maxData, error: maxError } = await supabase
      .from('aggregates_summary')
      .select('total, noise, rats, parking, trash')
      .eq('timeframe', 'month')
      .gt('total', 0)
      .order('total', { ascending: false })
      .limit(1)
      .single()

    if (maxError) throw maxError

    const maxTotal = maxData.total || 1
    const maxNoise = maxData.noise || 1
    const maxRats = maxData.rats || 1
    const maxParking = maxData.parking || 1
    const maxTrash = maxData.trash || 1

    console.log('Max values:', { maxTotal, maxNoise, maxRats, maxParking, maxTrash })

    // Get all month aggregates
    const { data: allData, error: allError } = await supabase
      .from('aggregates_summary')
      .select('id, neighborhood_id, total, noise, rats, parking, trash')
      .eq('timeframe', 'month')

    if (allError) throw allError

    // Calculate and update chaos scores
    let updated = 0
    for (const row of allData || []) {
      // Calculate chaos score with relative scaling
      // Weights: total (0.5), noise (0.2), rats (0.15), parking (0.1), trash (0.05)
      const chaosScore = Math.round(
        (Math.min(row.total / maxTotal, 1) * 0.5 +
         Math.min(row.noise / maxNoise, 1) * 0.2 +
         Math.min(row.rats / maxRats, 1) * 0.15 +
         Math.min(row.parking / maxParking, 1) * 0.1 +
         Math.min(row.trash / maxTrash, 1) * 0.05) * 100
      )

      // Update this record
      const { error: updateError } = await supabase
        .from('aggregates_summary')
        .update({ chaos_score: chaosScore })
        .eq('id', row.id)

      if (!updateError) updated++

      // Also update other timeframes for this neighborhood
      await supabase
        .from('aggregates_summary')
        .update({ chaos_score: chaosScore })
        .eq('neighborhood_id', row.neighborhood_id)
        .neq('timeframe', 'month')
    }

    // Verify results
    const { data: topResults } = await supabase
      .from('aggregates_summary')
      .select('neighborhood_id, total, noise, rats, parking, trash, chaos_score')
      .eq('timeframe', 'month')
      .order('total', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      updated,
      maxValues: { maxTotal, maxNoise, maxRats, maxParking, maxTrash },
      topResults
    })

  } catch (error) {
    console.error('Fix chaos error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

