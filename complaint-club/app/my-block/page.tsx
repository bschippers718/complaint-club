'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_CONFIG, type Category } from '@/lib/categories'
import { cn } from '@/lib/utils'

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

export default function MyBlockPage() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<NearbyData | null>(null)
  const [radius, setRadius] = useState(500)

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
          <div className="max-w-md mx-auto text-center py-16">
            <div className="text-6xl mb-6">📍</div>
            <h2 className="text-2xl font-bold mb-4">Share Your Location</h2>
            <p className="text-muted-foreground mb-8">
              We need your location to show complaints near you. 
              Your location is never stored or shared.
            </p>
            
            {locationError && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6">
                {locationError}
              </div>
            )}

            <Button onClick={requestLocation} size="lg">
              Enable Location
            </Button>
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
                      Based on {data.summary.total} complaints within {data.summary.radius_meters}m
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

            {/* Radius selector */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm text-muted-foreground">Radius:</span>
              {[250, 500, 1000].map((r) => (
                <Button
                  key={r}
                  variant={radius === r ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRadius(r)}
                >
                  {r}m
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
                      No complaints found within {radius}m. Lucky you!
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
  const config = CATEGORY_CONFIG[complaint.category]
  const timeAgo = getTimeAgo(new Date(complaint.created_at))

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="text-2xl">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('font-medium', config.color)}>{config.label}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">{complaint.distance_meters}m away</span>
        </div>
        <p className="text-sm text-foreground truncate">
          {complaint.type}
          {complaint.description && ` - ${complaint.description}`}
        </p>
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

