import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { mapComplaintTypeToCategory } from '@/lib/categories'

// NYC 311 Open Data API
const NYC_311_API = 'https://data.cityofnewyork.us/resource/erm2-nwe9.json'

// Fetch limit per request (API max is 50000)
const FETCH_LIMIT = 10000

// Batch size for database inserts
const BATCH_SIZE = 500

// Fields we need from the API
const FIELDS = [
  'unique_key',
  'complaint_type',
  'descriptor',
  'created_date',
  'latitude',
  'longitude',
  'borough',
  'incident_zip'
].join(',')

interface NYC311Record {
  unique_key: string
  complaint_type: string
  descriptor?: string
  created_date: string
  latitude?: string
  longitude?: string
  borough?: string
  incident_zip?: string
}

export const maxDuration = 300 // Allow up to 5 minutes for Vercel Pro

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const startTime = Date.now()

  // Track this ETL run
  const { data: etlRun } = await supabase
    .from('etl_runs')
    .insert({ status: 'running' })
    .select('id')
    .single()

  const runId = etlRun?.id

  try {
    // Get the last ingested complaint date
    const { data: lastRun } = await supabase
      .from('etl_runs')
      .select('last_complaint_date')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    // Default to last 7 days if no previous run
    const since = lastRun?.last_complaint_date 
      ? new Date(lastRun.last_complaint_date)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Format date for NYC Open Data API (YYYY-MM-DDTHH:MM:SS)
    const sinceFormatted = since.toISOString().slice(0, 19)
    console.log(`Fetching complaints since: ${sinceFormatted}`)

    // Build the API URL with SoQL query
    const whereClause = `created_date > '${sinceFormatted}'`
    const url = new URL(NYC_311_API)
    url.searchParams.set('$select', FIELDS)
    url.searchParams.set('$where', whereClause)
    url.searchParams.set('$order', 'created_date DESC')
    url.searchParams.set('$limit', FETCH_LIMIT.toString())

    // Fetch from NYC 311 API
    console.log(`Fetching from: ${url.toString()}`)
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`NYC 311 API error: ${response.status} ${response.statusText}`)
    }

    const records: NYC311Record[] = await response.json()
    console.log(`Fetched ${records.length} records`)

    if (records.length === 0) {
      // Update ETL run status
      if (runId) {
        await supabase
          .from('etl_runs')
          .update({
            completed_at: new Date().toISOString(),
            status: 'completed',
            records_fetched: 0,
            records_inserted: 0
          })
          .eq('id', runId)
      }

      return NextResponse.json({
        success: true,
        message: 'No new complaints found',
        stats: { fetched: 0, inserted: 0, duration_ms: Date.now() - startTime }
      })
    }

    // Process in batches for better performance
    let inserted = 0
    let errors = 0
    let latestDate = since

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (record) => {
          const category = mapComplaintTypeToCategory(record.complaint_type)
          const createdAt = new Date(record.created_date)
          
          if (createdAt > latestDate) {
            latestDate = createdAt
          }

          const lat = record.latitude ? parseFloat(record.latitude) : null
          const lon = record.longitude ? parseFloat(record.longitude) : null

          const { error } = await supabase.rpc('insert_complaint', {
            p_id: record.unique_key,
            p_category: category,
            p_complaint_type: record.complaint_type,
            p_descriptor: record.descriptor || null,
            p_created_at: record.created_date,
            p_latitude: lat,
            p_longitude: lon,
            p_incident_zip: record.incident_zip || null,
            p_borough: record.borough || null,
            p_raw: record
          })

          if (error) throw error
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          inserted++
        } else {
          errors++
        }
      }

      // Log progress
      console.log(`Processed ${Math.min(i + BATCH_SIZE, records.length)}/${records.length} (${inserted} inserted, ${errors} errors)`)
    }

    // Update ETL run status
    if (runId) {
      await supabase
        .from('etl_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
          records_fetched: records.length,
          records_inserted: inserted,
          last_complaint_date: latestDate.toISOString()
        })
        .eq('id', runId)
    }

    const duration = Date.now() - startTime
    console.log(`ETL complete: ${inserted} inserted, ${errors} errors, ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'ETL ingestion complete',
      stats: {
        fetched: records.length,
        inserted,
        errors,
        duration_ms: duration,
        latest_date: latestDate.toISOString()
      }
    })

  } catch (error) {
    console.error('ETL error:', error)

    // Update ETL run status on failure
    if (runId) {
      await supabase
        .from('etl_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', runId)
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Manual trigger endpoint for backfill
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { since, until, limit = 50000, offset = 0 } = body as { 
    since?: string
    until?: string
    limit?: number
    offset?: number
  }

  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const startTime = Date.now()

  try {
    // Build date range query
    let whereClause = 'created_date IS NOT NULL'
    if (since) {
      whereClause += ` AND created_date >= '${since}'`
    }
    if (until) {
      whereClause += ` AND created_date <= '${until}'`
    }

    const url = new URL(NYC_311_API)
    url.searchParams.set('$select', FIELDS)
    url.searchParams.set('$where', whereClause)
    url.searchParams.set('$order', 'created_date DESC')
    url.searchParams.set('$limit', limit.toString())
    url.searchParams.set('$offset', offset.toString())

    console.log(`Backfill fetching: ${url.toString()}`)
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`NYC 311 API error: ${response.status}`)
    }

    const records: NYC311Record[] = await response.json()
    console.log(`Backfill: Fetched ${records.length} records (offset: ${offset})`)

    let inserted = 0
    let errors = 0
    let skipped = 0

    // Process in batches with parallel inserts
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (record) => {
          const category = mapComplaintTypeToCategory(record.complaint_type)
          const lat = record.latitude ? parseFloat(record.latitude) : null
          const lon = record.longitude ? parseFloat(record.longitude) : null

          const { error } = await supabase.rpc('insert_complaint', {
            p_id: record.unique_key,
            p_category: category,
            p_complaint_type: record.complaint_type,
            p_descriptor: record.descriptor || null,
            p_created_at: record.created_date,
            p_latitude: lat,
            p_longitude: lon,
            p_incident_zip: record.incident_zip || null,
            p_borough: record.borough || null,
            p_raw: record
          })

          if (error) {
            // Duplicate key is expected during backfill, don't count as error
            if (error.message?.includes('duplicate') || error.code === '23505') {
              return 'skipped'
            }
            throw error
          }
          return 'inserted'
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value === 'skipped') {
            skipped++
          } else {
            inserted++
          }
        } else {
          errors++
        }
      }
    }

    const duration = Date.now() - startTime
    console.log(`Backfill complete: ${inserted} new, ${skipped} skipped, ${errors} errors, ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Backfill complete',
      stats: { 
        fetched: records.length, 
        inserted, 
        skipped,
        errors,
        duration_ms: duration,
        has_more: records.length === limit,
        next_offset: offset + records.length
      }
    })

  } catch (error) {
    console.error('Backfill error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
