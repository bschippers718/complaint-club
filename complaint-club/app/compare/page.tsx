'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { TimeframeToggle } from '@/components/timeframe-toggle'
import { ChaosGauge } from '@/components/chaos-gauge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { CATEGORY_CONFIG, type Category, type Timeframe } from '@/lib/categories'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Neighborhood {
  id: number
  name: string
  borough: string
}

interface CompareData {
  left: NeighborhoodCompare
  right: NeighborhoodCompare
  winner: 'left' | 'right' | 'tie'
  category_winners: Record<Category, 'left' | 'right' | 'tie'>
  timeframe: Timeframe
}

interface NeighborhoodCompare {
  id: number
  name: string
  borough: string
  total: number
  chaos_score: number
  rank: number
  category_counts: Record<Category, number>
}

function ComparePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [leftId, setLeftId] = useState<string>(searchParams.get('left') || '')
  const [rightId, setRightId] = useState<string>(searchParams.get('right') || '')
  const [timeframe, setTimeframe] = useState<Timeframe>('month')
  const [compareData, setCompareData] = useState<CompareData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch neighborhoods list
  useEffect(() => {
    async function fetchNeighborhoods() {
      try {
        const res = await fetch('/api/neighborhoods')
        const json = await res.json()
        setNeighborhoods(json.data?.neighborhoods || [])
      } catch (error) {
        console.error('Failed to fetch neighborhoods:', error)
      }
    }
    fetchNeighborhoods()
  }, [])

  // Fetch comparison data
  useEffect(() => {
    async function fetchComparison() {
      if (!leftId || !rightId) {
        setCompareData(null)
        return
      }

      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          left: leftId,
          right: rightId,
          timeframe
        })
        const res = await fetch(`/api/compare?${params}`)
        const json = await res.json()
        setCompareData(json.data)
      } catch (error) {
        console.error('Failed to fetch comparison:', error)
        setCompareData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchComparison()
  }, [leftId, rightId, timeframe])

  // Update URL when selections change
  const handleLeftChange = (value: string) => {
    setLeftId(value)
    const params = new URLSearchParams(searchParams)
    params.set('left', value)
    if (rightId) params.set('right', rightId)
    router.push(`/compare?${params.toString()}`)
  }

  const handleRightChange = (value: string) => {
    setRightId(value)
    const params = new URLSearchParams(searchParams)
    if (leftId) params.set('left', leftId)
    params.set('right', value)
    router.push(`/compare?${params.toString()}`)
  }

  const swapNeighborhoods = () => {
    const temp = leftId
    setLeftId(rightId)
    setRightId(temp)
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Neighborhood</span>
            <br />
            <span className="text-foreground">Battle ⚔️</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Compare two neighborhoods head-to-head. Who complains more?
          </p>
        </div>
      </section>

      {/* Selectors */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Left selector */}
            <div className="flex-1 w-full">
              <Select value={leftId} onValueChange={handleLeftChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select first neighborhood" />
                </SelectTrigger>
                <SelectContent>
                  {neighborhoods.map((n) => (
                    <SelectItem key={n.id} value={n.id.toString()}>
                      {n.name} ({n.borough})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Swap button */}
            <Button 
              variant="outline" 
              size="icon"
              onClick={swapNeighborhoods}
              disabled={!leftId || !rightId}
            >
              ⇄
            </Button>

            {/* Right selector */}
            <div className="flex-1 w-full">
              <Select value={rightId} onValueChange={handleRightChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select second neighborhood" />
                </SelectTrigger>
                <SelectContent>
                  {neighborhoods.map((n) => (
                    <SelectItem key={n.id} value={n.id.toString()}>
                      {n.name} ({n.borough})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <TimeframeToggle selected={timeframe} onSelect={setTimeframe} />
          </div>
        </div>
      </section>

      {/* Comparison Results */}
      <section className="container mx-auto px-4 py-8">
        {!leftId || !rightId ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚔️</div>
            <h2 className="text-2xl font-bold mb-2">Select Two Neighborhoods</h2>
            <p className="text-muted-foreground">
              Choose neighborhoods above to see them battle it out
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16">
            <div className="text-4xl animate-bounce">⚔️</div>
            <p className="text-muted-foreground mt-4">Loading battle data...</p>
          </div>
        ) : compareData ? (
          <ComparisonView data={compareData} />
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
            <p className="text-muted-foreground">
              Could not load comparison data for these neighborhoods
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function ComparisonView({ data }: { data: CompareData }) {
  const { left, right, winner, category_winners } = data

  return (
    <div className="max-w-6xl mx-auto">
      {/* Winner Banner */}
      <div className="text-center mb-8">
        {winner === 'tie' ? (
          <div className="inline-block px-6 py-3 bg-muted rounded-full">
            <span className="text-2xl mr-2">🤝</span>
            <span className="font-bold">It&apos;s a Tie!</span>
          </div>
        ) : (
          <div className="inline-block px-6 py-3 bg-primary/20 text-primary rounded-full">
            <span className="text-2xl mr-2">🏆</span>
            <span className="font-bold">
              {winner === 'left' ? left.name : right.name} wins the complaint battle!
            </span>
          </div>
        )}
      </div>

      {/* Head to Head */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Left Neighborhood */}
        <Card className={cn(
          'transition-all',
          winner === 'left' && 'ring-2 ring-primary'
        )}>
          <CardContent className="pt-6 text-center">
            <Link href={`/n/${left.id}`} className="hover:opacity-80 transition-opacity">
              <h3 className="text-2xl font-bold mb-1">{left.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{left.borough}</p>
            </Link>
            <ChaosGauge score={left.chaos_score} size="sm" />
            <div className="mt-4">
              <div className="text-3xl font-bold font-mono">{left.total.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">complaints</div>
            </div>
            {left.rank > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                Rank #{left.rank} in NYC
              </div>
            )}
          </CardContent>
        </Card>

        {/* VS */}
        <div className="flex items-center justify-center">
          <div className="text-6xl font-bold text-muted-foreground">VS</div>
        </div>

        {/* Right Neighborhood */}
        <Card className={cn(
          'transition-all',
          winner === 'right' && 'ring-2 ring-primary'
        )}>
          <CardContent className="pt-6 text-center">
            <Link href={`/n/${right.id}`} className="hover:opacity-80 transition-opacity">
              <h3 className="text-2xl font-bold mb-1">{right.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{right.borough}</p>
            </Link>
            <ChaosGauge score={right.chaos_score} size="sm" />
            <div className="mt-4">
              <div className="text-3xl font-bold font-mono">{right.total.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">complaints</div>
            </div>
            {right.rank > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                Rank #{right.rank} in NYC
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Comparison */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-bold mb-4">Category Breakdown</h3>
          <div className="space-y-4">
            {(Object.keys(category_winners) as Category[]).map((category) => {
              const leftCount = left.category_counts[category]
              const rightCount = right.category_counts[category]
              const catWinner = category_winners[category]
              const config = CATEGORY_CONFIG[category]
              const total = leftCount + rightCount
              const leftPct = total > 0 ? (leftCount / total) * 100 : 50

              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={cn(
                        'font-mono',
                        catWinner === 'left' && 'text-primary font-bold'
                      )}>
                        {leftCount.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className={cn(
                        'font-mono',
                        catWinner === 'right' && 'text-primary font-bold'
                      )}>
                        {rightCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Comparison bar */}
                  <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                    <div 
                      className={cn(
                        'h-full transition-all duration-500',
                        catWinner === 'left' ? 'bg-primary' : 'bg-primary/40'
                      )}
                      style={{ width: `${leftPct}%` }}
                    />
                    <div 
                      className={cn(
                        'h-full transition-all duration-500',
                        catWinner === 'right' ? 'bg-accent' : 'bg-accent/40'
                      )}
                      style={{ width: `${100 - leftPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-4xl animate-spin">⚔️</div>
        </div>
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  )
}

