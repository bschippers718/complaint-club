'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CATEGORY_CONFIG, type Category } from '@/lib/categories'
import { getChaosDescriptor } from '@/lib/chaos-score'
import { copyToClipboard } from '@/lib/share-utils'
import { cn } from '@/lib/utils'
import { Share2, Check } from 'lucide-react'

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
  const [copied, setCopied] = useState(false)
  const chaosInfo = getChaosDescriptor(chaosScore)
  const safeTotal = Number.isFinite(total) ? total : 0
  
  // Find top category
  const topCategory = (Object.entries(categoryCounts) as [Category, number][])
    .filter(([cat]) => cat !== 'other')
    .sort((a, b) => b[1] - a[1])[0]
  const topCount = topCategory?.[1] ?? 0

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'rank-gold'
    if (rank === 2) return 'rank-silver'
    if (rank === 3) return 'rank-bronze'
    return 'bg-muted text-muted-foreground'
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const topCat = topCategory ? CATEGORY_CONFIG[topCategory[0]] : null
    const url = `https://311complaints.nyc/n/${neighborhoodId}`
    
    let text: string
    if (topCat && topCount > 0) {
      text = `🗽 ${name} is #${rank} in NYC with ${safeTotal.toLocaleString()} complaints!\n\n${topCat.icon} Top issue: ${topCat.label.toLowerCase()} (${topCount.toLocaleString()})\n\nChaos Score: ${chaosScore}/100 ${chaosInfo.emoji}\n\n${url.trim()}`
    } else {
      text = `🗽 ${name} is #${rank} in NYC with ${safeTotal.toLocaleString()} complaints!\n\nChaos Score: ${chaosScore}/100 ${chaosInfo.emoji}\n\n${url.trim()}`
    }
    
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Link href={`/n/${neighborhoodId}`}>
      <div 
        className={cn(
          'group relative bg-card border border-border rounded-xl p-4 pr-10',
          'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
          'transition-all duration-300 cursor-pointer',
          'opacity-0 animate-slide-up overflow-hidden'
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
                  {safeTotal.toLocaleString()}
                </span>
              </div>
              
              {topCategory && topCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Top: </span>
                  <span>{CATEGORY_CONFIG[topCategory[0]].icon}</span>
                  <span className="font-mono">{topCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className={cn(
              'flex-shrink-0 p-2 rounded-lg transition-all duration-200',
              'hover:bg-muted/80 active:scale-95',
              'opacity-0 group-hover:opacity-100',
              copied && 'bg-green-500/10'
            )}
            title={copied ? 'Copied!' : 'Copy share text'}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Share2 className="h-4 w-4 text-muted-foreground hover:text-purple-500 transition-colors duration-200" />
            )}
          </button>

          {/* Chaos Score */}
          <div className="flex-shrink-0 text-right ml-2 mr-6">
            <div className="text-2xl mb-0.5 leading-none">{chaosInfo.emoji}</div>
            <div className={cn('text-2xl font-bold font-mono leading-tight', chaosInfo.color)}>
              {chaosScore}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">chaos</div>
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
                  CATEGORY_CONFIG[cat]?.bgColor || 'bg-gray-100',
                  CATEGORY_CONFIG[cat]?.color || 'text-gray-600'
                )}
              >
                {CATEGORY_CONFIG[cat]?.icon || '📋'} {count}
              </span>
            ))}
        </div>

        {/* Hover Arrow (Expand Icon) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-all duration-200 pointer-events-none z-10">
          <svg 
            className="w-3.5 h-3.5 text-primary/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary/80" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
