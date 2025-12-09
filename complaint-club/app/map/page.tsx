'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { NeighborhoodMap } from '@/components/neighborhood-map'
import { Button } from '@/components/ui/button'
import { 
  CATEGORY_CONFIG, 
  TIMEFRAMES, 
  CATEGORIES,
  type Category,
  type Timeframe 
} from '@/lib/categories'

type ColorByOption = 'total' | 'chaos_score' | Category

export default function MapPage() {
  const router = useRouter()
  const [timeframe, setTimeframe] = useState<Timeframe>('month')
  const [colorBy, setColorBy] = useState<ColorByOption>('total')

  const handleNeighborhoodClick = (id: number) => {
    router.push(`/n/${id}`)
  }

  const colorOptions: { value: ColorByOption; label: string; icon?: string }[] = [
    { value: 'total', label: 'Total Complaints', icon: '📊' },
    { value: 'chaos_score', label: 'Chaos Score', icon: '🔥' },
    ...CATEGORIES.map(cat => ({
      value: cat as ColorByOption,
      label: CATEGORY_CONFIG[cat].label,
      icon: CATEGORY_CONFIG[cat].icon
    }))
  ]

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="fixed inset-0 top-16"> {/* Full screen below navbar */}
        {/* Map */}
        <NeighborhoodMap 
          timeframe={timeframe} 
          colorBy={colorBy}
          onNeighborhoodClick={handleNeighborhoodClick}
        />

      {/* Controls overlay */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-start justify-between gap-4 pointer-events-none">
        {/* Title */}
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 pointer-events-auto">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>🗺️</span>
            <span>NYC Complaint Map</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Click any neighborhood to see details
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          {/* Timeframe */}
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 flex gap-1">
            {TIMEFRAMES.map(tf => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeframe(tf.value)}
                className="text-xs"
              >
                {tf.label}
              </Button>
            ))}
          </div>

          {/* Color by */}
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2">
            <select
              value={colorBy}
              onChange={(e) => setColorBy(e.target.value as ColorByOption)}
              className="bg-transparent border-none text-sm focus:outline-none cursor-pointer"
            >
              <optgroup label="General">
                <option value="total">📊 Total Complaints</option>
                <option value="chaos_score">🔥 Chaos Score</option>
              </optgroup>
              <optgroup label="Categories">
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Stats panel - bottom right */}
      <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 max-w-xs">
        <h3 className="font-semibold mb-2">Quick Stats</h3>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Timeframe:</span>
            <span className="font-mono text-foreground">{TIMEFRAMES.find(t => t.value === timeframe)?.label}</span>
          </div>
          <div className="flex justify-between">
            <span>Showing:</span>
            <span className="font-mono text-foreground">
              {colorOptions.find(c => c.value === colorBy)?.label}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Hover over neighborhoods to see complaint breakdowns. 
            Click to view full details.
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}

