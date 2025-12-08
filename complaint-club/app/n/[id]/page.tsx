'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { ChaosGauge } from '@/components/chaos-gauge'
import { CategoryBreakdown } from '@/components/category-breakdown'
import { TrendChart } from '@/components/trend-chart'
import { TimeframeToggle } from '@/components/timeframe-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Category, Timeframe } from '@/lib/categories'

interface NeighborhoodData {
  id: number
  name: string
  borough: string
  chaos_score: number
  chaos_label: string
  chaos_emoji: string
  top_category: Category
  top_category_count: number
  stats: Record<Timeframe, {
    total: number
    rats: number
    noise: number
    parking: number
    trash: number
    heat_water: number
    other: number
    rank: number
  }>
  trends: Array<{
    date: string
    total: number
    rats: number
    noise: number
    parking: number
    trash: number
    heat_water: number
    other: number
  }>
  insights: string[]
}

export default function NeighborhoodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<NeighborhoodData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<Timeframe>('month')
  const [showCategoryTrends, setShowCategoryTrends] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/neighborhood/${id}`)
        const json = await res.json()
        
        if (json.error) {
          setError(json.error)
          setData(null)
        } else {
          setData(json.data)
          setError(null)
        }
      } catch (err) {
        setError('Failed to load neighborhood data')
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto animate-pulse space-y-8">
            <div className="h-12 bg-muted rounded w-64" />
            <div className="h-8 bg-muted rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-64 bg-muted rounded-xl" />
              <div className="h-64 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">🏚️</div>
          <h1 className="text-2xl font-bold mb-2">Neighborhood Not Found</h1>
          <p className="text-muted-foreground mb-8">{error || 'This neighborhood does not exist.'}</p>
          <Link href="/">
            <Button>Back to Leaderboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentStats = data.stats[timeframe] || data.stats['month'] || {
    total: 0, rats: 0, noise: 0, parking: 0, trash: 0, heat_water: 0, other: 0, rank: 0
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            {/* Left: Info */}
            <div>
              <Link 
                href="/" 
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                ← Back to Leaderboard
              </Link>
              
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl md:text-5xl font-bold">{data.name}</h1>
                {currentStats.rank > 0 && currentStats.rank <= 3 && (
                  <span className={`
                    px-3 py-1 rounded-full text-sm font-bold
                    ${currentStats.rank === 1 ? 'rank-gold' : ''}
                    ${currentStats.rank === 2 ? 'rank-silver' : ''}
                    ${currentStats.rank === 3 ? 'rank-bronze' : ''}
                  `}>
                    #{currentStats.rank}
                  </span>
                )}
              </div>
              
              <p className="text-xl text-muted-foreground mb-6">{data.borough}</p>
              
              <div className="flex flex-wrap gap-4">
                <Link href={`/compare?left=${data.id}`}>
                  <Button variant="outline">
                    ⚔️ Compare to Another
                  </Button>
                </Link>
                <Link href={`/api/share/${data.id}`} target="_blank">
                  <Button variant="outline">
                    📤 Share Card
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Chaos Gauge */}
            <div className="flex flex-col items-center">
              <ChaosGauge score={data.chaos_score} size="lg" />
              <p className="text-sm text-muted-foreground mt-2">Chaos Score</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeframe Toggle */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <TimeframeToggle selected={timeframe} onSelect={setTimeframe} />
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard 
              label="Total Complaints" 
              value={currentStats.total.toLocaleString()} 
              rank={currentStats.rank}
            />
            <StatCard 
              label="Top Issue" 
              value={data.top_category.replace('_', '/')} 
              subValue={`${data.top_category_count} complaints`}
              emoji={getCategoryEmoji(data.top_category)}
            />
            <StatCard 
              label="Chaos Score" 
              value={data.chaos_score.toString()} 
              subValue={data.chaos_label}
              emoji={data.chaos_emoji}
            />
            <StatCard 
              label="City Rank" 
              value={currentStats.rank > 0 ? `#${currentStats.rank}` : 'N/A'} 
              subValue="of ~195 neighborhoods"
            />
          </div>

          {/* Insights */}
          {data.insights.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">💡 Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.map((insight, i) => (
                    <li key={i} className="text-muted-foreground">{insight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📊 Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryBreakdown 
                  counts={{
                    rats: currentStats.rats,
                    noise: currentStats.noise,
                    parking: currentStats.parking,
                    trash: currentStats.trash,
                    heat_water: currentStats.heat_water,
                    other: currentStats.other
                  }}
                  total={currentStats.total}
                />
              </CardContent>
            </Card>

            {/* Trend Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">📈 30-Day Trend</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCategoryTrends(!showCategoryTrends)}
                >
                  {showCategoryTrends ? 'Show Total' : 'Show Categories'}
                </Button>
              </CardHeader>
              <CardContent>
                {data.trends.length > 0 ? (
                  <TrendChart data={data.trends} showCategories={showCategoryTrends} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No trend data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  subValue, 
  rank, 
  emoji 
}: { 
  label: string
  value: string
  subValue?: string
  rank?: number
  emoji?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground mb-1">{label}</div>
        <div className="flex items-center gap-2">
          {emoji && <span className="text-2xl">{emoji}</span>}
          <span className="text-2xl font-bold font-mono">{value}</span>
          {rank && rank > 0 && rank <= 10 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              #{rank} in NYC
            </span>
          )}
        </div>
        {subValue && (
          <div className="text-sm text-muted-foreground mt-1">{subValue}</div>
        )}
      </CardContent>
    </Card>
  )
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    rats: '🐀',
    noise: '🔊',
    parking: '🚗',
    trash: '🗑️',
    heat_water: '🔥',
    other: '📋'
  }
  return emojis[category] || '📋'
}

