'use client'

import { CATEGORY_CONFIG, type Category } from '@/lib/categories'
import { cn } from '@/lib/utils'

interface CategoryFilterProps {
  selected: Category | 'all'
  onSelect: (category: Category | 'all') => void
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const categories: (Category | 'all')[] = ['all', 'rats', 'noise', 'parking', 'trash', 'heat_water', 'other']

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isAll = cat === 'all'
        const config = isAll ? null : CATEGORY_CONFIG[cat]
        const isSelected = selected === cat

        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              'border border-border hover:border-primary/50',
              isSelected && 'bg-primary text-primary-foreground border-primary',
              !isSelected && 'bg-card hover:bg-secondary'
            )}
          >
            {isAll ? (
              '🌆 All'
            ) : (
              <>
                {config?.icon} {config?.label}
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}

