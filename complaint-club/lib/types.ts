import type { Category, Timeframe } from './categories'

// API Response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Leaderboard types
export interface LeaderboardParams {
  category?: Category | 'all'
  timeframe?: Timeframe
  limit?: number
}

export interface LeaderboardEntry {
  rank: number
  neighborhood_id: number
  neighborhood_name: string
  borough: string
  total: number
  chaos_score: number
  category_counts: {
    rats: number
    noise: number
    parking: number
    trash: number
    heat_water: number
    construction: number
    building: number
    bikes: number
    other: number
  }
}

// Neighborhood detail types
export interface NeighborhoodDetail {
  id: number
  name: string
  borough: string
  rank: number
  total_rank: number
  chaos_score: number
  stats: {
    today: CategoryStats
    week: CategoryStats
    month: CategoryStats
    all: CategoryStats
  }
  trends: TrendData[]
  insights: string[]
}

export interface CategoryStats {
  total: number
  rats: number
  noise: number
  parking: number
  trash: number
  heat_water: number
  construction: number
  building: number
  bikes: number
  other: number
}

export interface TrendData {
  date: string
  total: number
  rats: number
  noise: number
  parking: number
  trash: number
  heat_water: number
  construction: number
  building: number
  bikes: number
  other: number
}

// Comparison types
export interface ComparisonData {
  left: NeighborhoodCompare
  right: NeighborhoodCompare
  winner: 'left' | 'right' | 'tie'
  category_winners: Record<Category, 'left' | 'right' | 'tie'>
}

export interface NeighborhoodCompare {
  id: number
  name: string
  borough: string
  total: number
  chaos_score: number
  rank: number
  category_counts: {
    rats: number
    noise: number
    parking: number
    trash: number
    heat_water: number
    construction: number
    building: number
    bikes: number
    other: number
  }
}

// Nearby complaints types
export interface NearbyParams {
  lat: number
  lon: number
  radius_meters?: number
  limit?: number
}

export interface NearbyComplaint {
  id: string
  category: Category
  created_at: string
  distance_meters: number
  description?: string
  address?: string
}

// Share card types
export interface ShareCardData {
  neighborhood_name: string
  borough: string
  rank: number
  total_complaints: number
  chaos_score: number
  timeframe: Timeframe
  top_category: Category
  top_category_count: number
}
