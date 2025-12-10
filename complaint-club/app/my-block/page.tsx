'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_CONFIG, CATEGORIES, type Category } from '@/lib/categories'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ReportButtons } from '@/components/report-buttons'

interface NearbyComplaint {
  id: string
  category: Category
  type: string
  description: string | null
  created_at: string
  distance_meters: number
  neighborhood: string | null
}

interface NearbyData {
  complaints: NearbyComplaint[]
  summary: {
    total: number
    radius_meters: number
    annoyance_score: number
    category_breakdown: Record<string, number>
  }
  location: { lat: number; lon: number }
}

interface CategoryLeader {
  category: Category
  neighborhood_name: string
  neighborhood_id: number
  count: number
}

export default function MyBlockPage() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<NearbyData | null>(null)
  const [radius, setRadius] = useState(200)
  const [categoryLeaders, setCategoryLeaders] = useState<CategoryLeader[]>([])
  const [leadersLoading, setLeadersLoading] = useState(true)

  // Fetch category leaders for pre-location display
  useEffect(() => {
    async function fetchCategoryLeaders() {
      try {
        const categoriesToFetch: Category[] = ['noise', 'rats', 'trash', 'parking', 'heat_water']
        const leaders: CategoryLeader[] = []
        
        // Fetch top neighborhood for each category
        for (const category of categoriesToFetch) {
          const res = await fetch(`/api/leaderboard?category=${category}&timeframe=month&limit=1`)
          const json = await res.json()
          if (json.data && json.data[0]) {
            leaders.push({
              category,
              neighborhood_name: json.data[0].neighborhood_name,
              neighborhood_id: json.data[0].neighborhood_id,
              count: json.data[0].category_counts[category] || json.data[0].total
            })
          }
        }
        
        setCategoryLeaders(leaders)
      } catch (error) {
        console.error('Failed to fetch category leaders:', error)
      } finally {
        setLeadersLoading(false)
      }
    }
    
    fetchCategoryLeaders()
  }, [])

  const requestLocation = () => {
    setIsLoading(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        })
        setIsLoading(false)
      },
      (error) => {
        let message = 'Unable to get your location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable'
            break
          case error.TIMEOUT:
            message = 'Location request timed out'
            break
        }
        setLocationError(message)
        setIsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  // Fetch nearby complaints when location is available
  useEffect(() => {
    if (!location) return

    const currentLocation = location // Capture for closure

    async function fetchNearby() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          lat: currentLocation.lat.toString(),
          lon: currentLocation.lon.toString(),
          radius: radius.toString(),
          limit: '50'
        })
        const res = await fetch(`/api/nearby?${params}`)
        const json = await res.json()
        
        if (json.error) {
          setLocationError(json.error)
          setData(null)
        } else {
          setData(json.data)
          setLocationError(null)
        }
      } catch (error) {
        setLocationError('Failed to fetch nearby complaints')
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNearby()
  }, [location, radius])

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">My Block</span> 📍
          </h1>
          <p className="text-xl text-muted-foreground">
            See what&apos;s happening right around you. Complaints within walking distance.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        {!location && !isLoading && (
          <div className="max-w-4xl mx-auto">
            {/* Call to action */}
            <Card className="mb-8 border-primary/50 bg-gradient-to-br from-primary/10 to-transparent">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="text-6xl">📍</div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold mb-2">Report Issues on Your Block</h2>
                    <p className="text-muted-foreground mb-4">
                      Enable location to see complaints near you and quickly report issues. 
                      Your location is never stored or shared.
                    </p>
                    {locationError && (
                      <div className="bg-destructive/10 text-destructive rounded-lg p-3 mb-4 text-sm">
                        {locationError}
                      </div>
                    )}
                    <Button onClick={requestLocation} size="lg">
                      Enable Location to Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Leaders Preview */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                Top Neighborhoods by Category This Month
              </h3>
              {leadersLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="pt-4 pb-4">
                        <div className="h-16 bg-muted rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryLeaders.map((leader) => {
                    const config = CATEGORY_CONFIG[leader.category]
                    return (
                      <Link key={leader.category} href={`/n/${leader.neighborhood_id}`}>
                        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="text-3xl">{config.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className={cn("font-semibold text-sm", config.color)}>
                                  {config.label} Leader
                                </div>
                                <div className="font-bold truncate">
                                  {leader.neighborhood_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {leader.count.toLocaleString()} complaints
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Explore link */}
            <div className="text-center">
              <Link href="/" className="text-primary hover:underline">
                View Full Leaderboard →
              </Link>
            </div>
          </div>
        )}

        {isLoading && !data && (
          <div className="text-center py-16">
            <div className="text-4xl animate-bounce mb-4">📍</div>
            <p className="text-muted-foreground">Finding complaints near you...</p>
          </div>
        )}

        {location && data && (
          <div className="max-w-4xl mx-auto">
            {/* Annoyance Score */}
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Your Annoyance Score</h2>
                    <p className="text-muted-foreground">
                      Based on {data.summary.total} complaints within {Math.round(data.summary.radius_meters / 100)} {data.summary.radius_meters <= 100 ? 'block' : 'blocks'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-6xl font-bold font-mono text-primary">
                      {data.summary.annoyance_score}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getAnnoyanceLabel(data.summary.annoyance_score)}
                    </div>
                  </div>
                </div>

                {/* Category breakdown */}
                <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border">
                  {Object.entries(data.summary.category_breakdown).map(([cat, count]) => {
                    const config = CATEGORY_CONFIG[cat as Category]
                    return (
                      <Badge 
                        key={cat} 
                        variant="secondary"
                        className={cn('text-sm', config?.color)}
                      >
                        {config?.icon} {config?.label}: {count}
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Report Buttons */}
            <Card className="mb-8">
              <CardContent className="pt-6">
                <ReportButtons 
                  location={location} 
                  onReport={(category) => {
                    // Could refresh data here if needed
                    console.log(`Reported ${category}`)
                  }}
                />
              </CardContent>
            </Card>

            {/* Radius selector */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm text-muted-foreground">Radius:</span>
              {[100, 200, 500].map((r) => (
                <Button
                  key={r}
                  variant={radius === r ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRadius(r)}
                >
                  {Math.round(r / 100)} {r === 100 ? 'block' : 'blocks'}
                </Button>
              ))}
            </div>

            {/* Complaints list */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Complaints Nearby</CardTitle>
              </CardHeader>
              <CardContent>
                {data.complaints.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎉</div>
                    <p className="text-muted-foreground">
                      No complaints found within {Math.round(radius / 100)} {radius <= 100 ? 'block' : 'blocks'}. Lucky you!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.complaints.map((complaint) => (
                      <ComplaintItem key={complaint.id} complaint={complaint} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Refresh button */}
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={requestLocation}>
                🔄 Refresh Location
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function ComplaintItem({ complaint }: { complaint: NearbyComplaint }) {
  const [expanded, setExpanded] = useState(false)
  const config = CATEGORY_CONFIG[complaint.category]
  const timeAgo = getTimeAgo(new Date(complaint.created_at))
  const hasDetails = complaint.type || complaint.description

  return (
    <div 
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors",
        hasDetails && "cursor-pointer"
      )}
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      <div className="text-2xl">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('font-medium', config.color)}>{config.label}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">{complaint.distance_meters < 100 ? '<1 block' : `${Math.round(complaint.distance_meters / 100)} ${complaint.distance_meters < 150 ? 'block' : 'blocks'}`} away</span>
          {hasDetails && (
            <span className="text-xs text-muted-foreground ml-auto">
              {expanded ? '▼' : '▶'}
            </span>
          )}
        </div>
        <p className={cn("text-sm text-foreground", !expanded && "truncate")}>
          {complaint.type}
          {complaint.description && ` - ${complaint.description}`}
        </p>
        {expanded && complaint.description && (
          <div className="mt-2 p-2 bg-background/50 rounded text-sm">
            <span className="text-muted-foreground">Details: </span>
            {complaint.description}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{timeAgo}</span>
          {complaint.neighborhood && (
            <>
              <span>•</span>
              <span>{complaint.neighborhood}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function getAnnoyanceLabel(score: number): string {
  if (score >= 80) return '😱 Extremely Annoying'
  if (score >= 60) return '😤 Very Annoying'
  if (score >= 40) return '😕 Somewhat Annoying'
  if (score >= 20) return '😐 Mildly Annoying'
  return '😌 Pretty Peaceful'
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

