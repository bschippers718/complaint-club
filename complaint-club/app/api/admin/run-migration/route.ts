import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Admin endpoint to run SQL migrations
// Protected by a simple auth header check

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'complaint-club-admin-2024'

export async function POST(request: NextRequest) {
  // Check authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { sql } = await request.json()
    
    if (!sql) {
      return NextResponse.json({ error: 'Missing SQL parameter' }, { status: 400 })
    }

    const supabase = createServiceClient()
    
    // Execute the SQL using rpc with raw SQL
    // Note: This requires the service role key
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // If exec_sql doesn't exist, try a different approach
      console.error('SQL execution error:', error)
      return NextResponse.json({ 
        error: error.message,
        hint: 'You may need to run this SQL directly in the Supabase SQL Editor'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Migration executed successfully',
      data 
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


