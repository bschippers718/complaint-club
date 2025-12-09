'use client'

import { CATEGORY_CONFIG, type Category } from '@/lib/categories'
import { cn } from '@/lib/utils'

interface CategoryBreakdownProps {
  counts: Record<Category, number>
  total: number
}

export function CategoryBreakdown({ counts, total }: CategoryBreakdownProps) {
  // Sort by count descending, filter out zeros for cleaner display
  const sorted = (Object.entries(counts) as [Category, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  if (sorted.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No complaints in this timeframe
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sorted.map(([category, count]) => {
        const config = CATEGORY_CONFIG[category]
        if (!config) return null
        
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0

        return (
          <div key={category} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className="font-medium">{config.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{count.toLocaleString()}</span>
                <span className="text-muted-foreground text-sm">({percentage}%)</span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  config.bgColor.replace('bg-', 'bg-')
                )}
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: `oklch(0.65 0.18 ${getCategoryHue(category)})` 
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getCategoryHue(category: Category): number {
  const hues: Record<Category, number> = {
    rats: 45,        // amber
    noise: 300,      // purple
    parking: 230,    // blue
    trash: 145,      // green
    heat_water: 25,  // red-orange
    construction: 35, // orange
    building: 60,    // stone/brown
    bikes: 195,      // cyan
    other: 280       // gray-purple
  }
  return hues[category]
}
