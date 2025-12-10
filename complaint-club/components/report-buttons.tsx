'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CATEGORY_CONFIG, type Category } from '@/lib/categories'
import { cn } from '@/lib/utils'

interface ReportButtonsProps {
  location: { lat: number; lon: number }
  onReport?: (category: Category) => void
}

const REPORTABLE_CATEGORIES: Category[] = ['noise', 'rats', 'trash', 'parking', 'heat_water', 'building', 'other']

export function ReportButtons({ location, onReport }: ReportButtonsProps) {
  const [reportingCategory, setReportingCategory] = useState<Category | null>(null)
  const [reportedCategories, setReportedCategories] = useState<Set<Category>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const handleReport = async (category: Category) => {
    if (reportedCategories.has(category)) {
      return // Already reported this category recently
    }

    setReportingCategory(category)
    setError(null)

    try {
      // Get or create session ID for rate limiting
      let sessionId = sessionStorage.getItem('report_session_id')
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2)
        sessionStorage.setItem('report_session_id', sessionId)
      }

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          lat: location.lat,
          lon: location.lon,
          sessionId
        })
      })

      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error || 'Failed to report')
      }

      // Mark as reported
      setReportedCategories(prev => new Set([...prev, category]))
      
      // Call callback if provided
      onReport?.(category)

      // Reset after 1 hour (in memory - will reset on page refresh anyway)
      setTimeout(() => {
        setReportedCategories(prev => {
          const next = new Set(prev)
          next.delete(category)
          return next
        })
      }, 60 * 60 * 1000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report')
    } finally {
      setReportingCategory(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Quick Report</h3>
        <span className="text-xs text-muted-foreground">Tap to +1 an issue</span>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {REPORTABLE_CATEGORIES.map((category) => {
          const config = CATEGORY_CONFIG[category]
          const isReporting = reportingCategory === category
          const isReported = reportedCategories.has(category)
          
          return (
            <Button
              key={category}
              variant={isReported ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-3 px-2",
                isReported && "bg-primary/20 border-primary",
                isReporting && "opacity-50"
              )}
              onClick={() => handleReport(category)}
              disabled={isReporting || isReported}
            >
              <span className="text-2xl">{config.icon}</span>
              <span className="text-xs font-medium">
                {isReported ? '✓' : '+1'}
              </span>
            </Button>
          )
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {reportedCategories.size > 0 && (
        <p className="text-sm text-muted-foreground">
          Thanks for reporting! Your input helps track local issues.
        </p>
      )}
    </div>
  )
}
