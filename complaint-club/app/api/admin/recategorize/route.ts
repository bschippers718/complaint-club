import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { mapComplaintTypeToCategory } from '@/lib/categories'

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
    const { recategorize_all = false, only_other = true } = body as {
      recategorize_all?: boolean
      only_other?: boolean
    }

    // Build query - either all complaints or just "other" category
    let query = supabase.from('complaints').select('id, complaint_type, category')
    
    if (only_other) {
      query = query.eq('category', 'other')
    }

    const { data: complaints, error } = await query.limit(10000)

    if (error) throw error

    if (!complaints || complaints.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No complaints found to recategorize',
        stats: { processed: 0, updated: 0, unchanged: 0 }
      })
    }

    console.log(`Recategorizing ${complaints.length} complaints...`)

    let updated = 0
    let unchanged = 0
    const categoryChanges: Record<string, { from: string; to: string; count: number }> = {}

    // Process in batches
    const BATCH_SIZE = 500
    for (let i = 0; i < complaints.length; i += BATCH_SIZE) {
      const batch = complaints.slice(i, i + BATCH_SIZE)
      
      for (const complaint of batch) {
        if (!complaint.complaint_type) {
          unchanged++
          continue
        }

        const newCategory = mapComplaintTypeToCategory(complaint.complaint_type)
        const oldCategory = complaint.category

        if (newCategory === oldCategory) {
          unchanged++
          continue
        }

        // Update the complaint
        const { error: updateError } = await supabase
          .from('complaints')
          .update({ category: newCategory })
          .eq('id', complaint.id)

        if (updateError) {
          console.error(`Error updating complaint ${complaint.id}:`, updateError)
          continue
        }

        updated++

        // Track category changes
        const changeKey = `${oldCategory}->${newCategory}`
        if (!categoryChanges[changeKey]) {
          categoryChanges[changeKey] = { from: oldCategory, to: newCategory, count: 0 }
        }
        categoryChanges[changeKey].count++
      }

      console.log(`Processed ${Math.min(i + BATCH_SIZE, complaints.length)}/${complaints.length} (${updated} updated, ${unchanged} unchanged)`)
    }

    return NextResponse.json({
      success: true,
      message: 'Recategorization complete',
      stats: {
        processed: complaints.length,
        updated,
        unchanged,
        category_changes: Object.values(categoryChanges)
      }
    })

  } catch (error) {
    console.error('Recategorize error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


