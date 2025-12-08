'use client'

import { TIMEFRAMES, type Timeframe } from '@/lib/categories'
import { cn } from '@/lib/utils'

interface TimeframeToggleProps {
  selected: Timeframe
  onSelect: (timeframe: Timeframe) => void
}

export function TimeframeToggle({ selected, onSelect }: TimeframeToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-1">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onSelect(tf.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
            selected === tf.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}

