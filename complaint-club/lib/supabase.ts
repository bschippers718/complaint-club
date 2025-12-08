import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-loaded Supabase client for client-side use
let supabaseInstance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

// Server-side Supabase client with service role (for cron jobs and admin operations)
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Database types
export interface Neighborhood {
  id: number
  name: string
  borough: string
  polygon?: unknown // PostGIS geometry
}

export interface Complaint {
  id: string
  neighborhood_id: number | null
  category: 'rats' | 'noise' | 'parking' | 'trash' | 'heat_water' | 'other'
  created_at: string
  latitude: number
  longitude: number
  raw: Record<string, unknown>
}

export interface AggregateDaily {
  id: number
  neighborhood_id: number
  date: string
  category: string
  count: number
}

export interface AggregateSummary {
  id: number
  neighborhood_id: number
  neighborhood_name?: string
  borough?: string
  timeframe: 'today' | 'week' | 'month' | 'all'
  total: number
  rats: number
  noise: number
  parking: number
  trash: number
  heat_water: number
  other: number
  chaos_score: number
}

export interface LeaderboardEntry extends AggregateSummary {
  rank: number
  neighborhood_name: string
  borough: string
}
