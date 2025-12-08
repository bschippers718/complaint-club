'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/navbar'
import { CategoryFilter } from '@/components/category-filter'
import { TimeframeToggle } from '@/components/timeframe-toggle'
import { LeaderboardList } from '@/components/leaderboard-list'
import type { Category, Timeframe } from '@/lib/categories'

interface LeaderboardEntry {
  rank: number
  neighborhood_id: number
  neighborhood_name: string
  borough: string
  total: number
  chaos_score: number
  category_counts: Record<Category, number>
}

export default function Home() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [timeframe, setTimeframe] = useState<Timeframe>('month')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          category,
          timeframe,
          limit: '50'
        })
        const res = await fetch(`/api/leaderboard?${params}`)
        const json = await res.json()
        setEntries(json.data || [])
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
        setEntries([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [category, timeframe])

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 py-16 relative">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              <span className="gradient-text">NYC Complaint</span>
              <br />
              <span className="text-foreground">Leaderboard</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              See which neighborhoods are complaining the most. 
              Rats, noise, parking, and more — ranked by chaos score.
            </p>
            
            {/* Stats row */}
            <div className="flex flex-wrap gap-6">
              <Stat label="Neighborhoods" value="195+" />
              <Stat label="Complaints Tracked" value="1M+" />
              <Stat label="Updated" value="Every 5min" />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CategoryFilter selected={category} onSelect={setCategory} />
            <TimeframeToggle selected={timeframe} onSelect={setTimeframe} />
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <LeaderboardList entries={entries} isLoading={isLoading} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>
              Data from <a href="https://data.cityofnewyork.us" className="text-primary hover:underline" target="_blank" rel="noopener">NYC Open Data</a> 311 Service Requests
            </div>
            <div>
              Built with 🗽 for NYC
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold font-mono text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}
