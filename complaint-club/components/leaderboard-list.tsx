'use client'

import { NeighborhoodCard } from './neighborhood-card'
import type { Category } from '@/lib/categories'

interface LeaderboardEntry {
  rank: number
  neighborhood_id: number
  neighborhood_name: string
  borough: string
  total: number
  chaos_score: number
  category_counts: Record<Category, number>
}

interface LeaderboardListProps {
  entries: LeaderboardEntry[]
  isLoading?: boolean
}

export function LeaderboardList({ entries, isLoading }: LeaderboardListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-4 animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-muted rounded-lg" />
              <div className="flex-1">
                <div className="h-5 bg-muted rounded w-48 mb-2" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
              <div className="w-16">
                <div className="h-8 bg-muted rounded mb-1" />
                <div className="h-3 bg-muted rounded w-10 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🏙️</div>
        <h3 className="text-xl font-semibold mb-2">No data yet</h3>
        <p className="text-muted-foreground">
          The leaderboard will populate once complaint data is ingested.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <NeighborhoodCard
          key={entry.neighborhood_id}
          rank={entry.rank}
          neighborhoodId={entry.neighborhood_id}
          name={entry.neighborhood_name}
          borough={entry.borough}
          total={entry.total}
          chaosScore={entry.chaos_score}
          categoryCounts={entry.category_counts}
          animationDelay={index * 50}
        />
      ))}
    </div>
  )
}

