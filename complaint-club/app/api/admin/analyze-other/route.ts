import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
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
    // Get all complaints categorized as "other"
    const { data: otherComplaints, error } = await supabase
      .from('complaints')
      .select('complaint_type, descriptor')
      .eq('category', 'other')
      .limit(10000) // Get a good sample

    if (error) throw error

    // Group by complaint_type and count
    const typeCounts: Record<string, { count: number; sampleDescriptors: string[] }> = {}
    
    for (const complaint of otherComplaints || []) {
      const type = complaint.complaint_type || 'Unknown'
      if (!typeCounts[type]) {
        typeCounts[type] = { count: 0, sampleDescriptors: [] }
      }
      typeCounts[type].count++
      if (complaint.descriptor && typeCounts[type].sampleDescriptors.length < 5) {
        typeCounts[type].sampleDescriptors.push(complaint.descriptor)
      }
    }

    // Sort by count descending
    const sortedTypes = Object.entries(typeCounts)
      .map(([type, data]) => ({
        complaint_type: type,
        count: data.count,
        sample_descriptors: data.sampleDescriptors
      }))
      .sort((a, b) => b.count - a.count)

    const totalOther = otherComplaints?.length || 0

    return NextResponse.json({
      success: true,
      total_other_complaints: totalOther,
      unique_types: sortedTypes.length,
      breakdown: sortedTypes,
      top_10: sortedTypes.slice(0, 10)
    })

  } catch (error) {
    console.error('Analyze other error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


