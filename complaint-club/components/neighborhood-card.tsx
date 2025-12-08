'use client'

import Link from 'next/link'
import { CATEGORY_CONFIG, type Category } from '@/lib/categories'
import { getChaosDescriptor } from '@/lib/chaos-score'
import { cn } from '@/lib/utils'

interface NeighborhoodCardProps {
  rank: number
  neighborhoodId: number
  name: string
  borough: string
  total: number
  chaosScore: number
  categoryCounts: Record<Category, number>
  animationDelay?: number
}

export function NeighborhoodCard({
  rank,
  neighborhoodId,
  name,
  borough,
  total,
  chaosScore,
  categoryCounts,
  animationDelay = 0
}: NeighborhoodCardProps) {
  const chaosInfo = getChaosDescriptor(chaosScore)
  
  // Find top category
  const topCategory = (Object.entries(categoryCounts) as [Category, number][])
    .sort((a, b) => b[1] - a[1])[0]

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'rank-gold'
    if (rank === 2) return 'rank-silver'
    if (rank === 3) return 'rank-bronze'
    return 'bg-muted text-muted-foreground'
  }

  return (
    <Link href={`/n/${neighborhoodId}`}>
      <div 
        className={cn(
          'group relative bg-card border border-border rounded-xl p-4',
          'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
          'transition-all duration-300 cursor-pointer',
          'opacity-0 animate-slide-up'
        )}
        style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'forwards' }}
      >
        {/* Rank Badge */}
        <div className="flex items-start gap-4">
          <div 
            className={cn(
              'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
              'text-lg font-bold',
              getRankBadgeClass(rank)
            )}
          >
            #{rank}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {name}
              </h3>
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                {borough}
              </span>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Complaints: </span>
                <span className="font-mono font-semibold text-foreground">
                  {total.toLocaleString()}
                </span>
              </div>
              
              {topCategory && topCategory[1] > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Top: </span>
                  <span>{CATEGORY_CONFIG[topCategory[0]].icon}</span>
                  <span className="font-mono">{topCategory[1]}</span>
                </div>
              )}
            </div>
          </div>

          {/* Chaos Score */}
          <div className="flex-shrink-0 text-right">
            <div className="text-2xl mb-0.5">{chaosInfo.emoji}</div>
            <div className={cn('text-2xl font-bold font-mono', chaosInfo.color)}>
              {chaosScore}
            </div>
            <div className="text-xs text-muted-foreground">chaos</div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
          {(Object.entries(categoryCounts) as [Category, number][])
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([cat, count]) => (
              <span
                key={cat}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                  CATEGORY_CONFIG[cat].bgColor,
                  CATEGORY_CONFIG[cat].color
                )}
              >
                {CATEGORY_CONFIG[cat].icon} {count}
              </span>
            ))}
        </div>

        {/* Hover Arrow */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

