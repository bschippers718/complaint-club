'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { CATEGORY_CONFIG, type Timeframe, type Category } from '@/lib/categories'

// NYC Open Data NTA boundaries GeoJSON
const NYC_NTA_GEOJSON = 'https://data.cityofnewyork.us/resource/9nt8-h7nd.geojson?$limit=500'

interface NeighborhoodStats {
  id: number
  name: string
  borough: string
  nta_code: string
  total: number
  rats: number
  noise: number
  parking: number
  trash: number
  heat_water: number
  other: number
  chaos_score: number
}

interface NeighborhoodMapProps {
  timeframe: Timeframe
  colorBy: 'total' | 'chaos_score' | Category
  onNeighborhoodClick?: (id: number) => void
}

// Dynamically import Leaflet components (they need window)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
)

export function NeighborhoodMap({ timeframe, colorBy, onNeighborhoodClick }: NeighborhoodMapProps) {
  const [geoData, setGeoData] = useState<any>(null)
  const [stats, setStats] = useState<Map<string, NeighborhoodStats>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [maxValue, setMaxValue] = useState(100)
  const [isMounted, setIsMounted] = useState(false)
  const geoJsonRef = useRef<any>(null)

  // Check if we're on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch complaint stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/map/neighborhoods?timeframe=${timeframe}`)
        const data = await res.json()
        
        const statsMap = new Map<string, NeighborhoodStats>()
        let max = 0
        
        for (const feature of data.features || []) {
          const props = feature.properties
          if (props?.nta_code) {
            statsMap.set(props.nta_code, props)
            const value = colorBy === 'chaos_score' ? props.chaos_score : 
                         colorBy === 'total' ? props.total : 
                         props[colorBy] || 0
            if (value > max) max = value
          }
        }
        
        setStats(statsMap)
        setMaxValue(max || 100)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }
    
    fetchStats()
  }, [timeframe, colorBy])

  // Fetch GeoJSON boundaries
  useEffect(() => {
    async function fetchGeoJSON() {
      try {
        const res = await fetch(NYC_NTA_GEOJSON)
        const data = await res.json()
        setGeoData(data)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch GeoJSON:', error)
        setIsLoading(false)
      }
    }
    
    fetchGeoJSON()
  }, [])

  // Style function for GeoJSON
  const getFeatureStyle = (feature: any) => {
    const ntaCode = feature?.properties?.nta2020
    const stat = stats.get(ntaCode)
    
    if (!stat) {
      return {
        fillColor: '#1a1a2e',
        weight: 1,
        opacity: 0.8,
        color: '#4a4a6a',
        fillOpacity: 0.6
      }
    }
    
    const value = colorBy === 'chaos_score' ? stat.chaos_score : 
                 colorBy === 'total' ? stat.total : 
                 stat[colorBy] || 0
    const intensity = maxValue > 0 ? value / maxValue : 0
    const color = getHeatColor(intensity)
    
    return {
      fillColor: color,
      weight: 1,
      opacity: 0.8,
      color: '#4a4a6a',
      fillOpacity: 0.7
    }
  }

  // Event handlers for each feature
  const onEachFeature = (feature: any, layer: any) => {
    const ntaCode = feature?.properties?.nta2020
    const ntaName = feature?.properties?.ntaname
    const borough = feature?.properties?.boroname
    const stat = stats.get(ntaCode)

    // Tooltip content (shows on hover)
    const tooltipContent = `
      <div style="min-width: 200px; font-family: system-ui, sans-serif; padding: 8px;">
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #fff;">${ntaName || 'Unknown'}</div>
        <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">${borough || ''}</div>
        ${stat ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; color: #fff;">
            <div><span style="color: #888;">Total:</span> <strong>${stat.total.toLocaleString()}</strong></div>
            <div><span style="color: #888;">Chaos:</span> <strong style="color: #0ea5e9;">${stat.chaos_score}</strong></div>
            <div>🐀 ${stat.rats}</div>
            <div>🔊 ${stat.noise}</div>
            <div>🚗 ${stat.parking}</div>
            <div>🗑️ ${stat.trash}</div>
          </div>
        ` : '<div style="color: #888; font-size: 12px;">No complaint data</div>'}
      </div>
    `

    // Use tooltip for hover instead of popup
    layer.bindTooltip(tooltipContent, {
      permanent: false,
      sticky: true,
      direction: 'auto',
      className: 'neighborhood-tooltip'
    })

    layer.on({
      mouseover: (e: any) => {
        const layer = e.target
        layer.setStyle({
          weight: 3,
          color: '#00d4ff',
          fillOpacity: 0.85
        })
        layer.bringToFront()
      },
      mouseout: (e: any) => {
        if (geoJsonRef.current) {
          geoJsonRef.current.resetStyle(e.target)
        }
      },
      click: () => {
        if (stat && onNeighborhoodClick) {
          onNeighborhoodClick(stat.id)
        }
      }
    })
  }

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-4">🗺️</div>
          <div className="text-muted-foreground">Loading map...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Import Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      
      <MapContainer
        center={[40.730610, -73.935242]}
        zoom={11}
        minZoom={10}
        maxZoom={16}
        style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
        className="z-0"
      >
        {/* Dark theme tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Neighborhood polygons */}
        {geoData && stats.size > 0 && (
          <GeoJSON
            ref={geoJsonRef}
            key={`${timeframe}-${colorBy}-${maxValue}-${stats.size}`}
            data={geoData}
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center">
            <div className="text-4xl animate-bounce mb-4">🗺️</div>
            <div className="text-muted-foreground">Loading neighborhoods...</div>
          </div>
        </div>
      )}

      {/* Tooltip styles */}
      <style jsx global>{`
        .neighborhood-tooltip {
          background: rgba(20, 20, 35, 0.95) !important;
          border: 1px solid rgba(100, 100, 140, 0.4) !important;
          border-radius: 8px !important;
          padding: 0 !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
        }
        .neighborhood-tooltip .leaflet-tooltip-content {
          margin: 0;
        }
        .leaflet-tooltip-left.neighborhood-tooltip::before {
          border-left-color: rgba(20, 20, 35, 0.95) !important;
        }
        .leaflet-tooltip-right.neighborhood-tooltip::before {
          border-right-color: rgba(20, 20, 35, 0.95) !important;
        }
        .leaflet-tooltip-top.neighborhood-tooltip::before {
          border-top-color: rgba(20, 20, 35, 0.95) !important;
        }
        .leaflet-tooltip-bottom.neighborhood-tooltip::before {
          border-bottom-color: rgba(20, 20, 35, 0.95) !important;
        }
      `}</style>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 z-[1000]">
        <div className="text-sm font-medium mb-2">
          {colorBy === 'total' ? 'Total Complaints' : 
           colorBy === 'chaos_score' ? 'Chaos Score' :
           CATEGORY_CONFIG[colorBy]?.label || colorBy}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Low</span>
          <div className="flex h-3 w-32 rounded overflow-hidden">
            <div className="flex-1" style={{ background: 'linear-gradient(to right, #1a1a4e, #0891b2, #eab308, #ef4444)' }} />
          </div>
          <span className="text-xs text-muted-foreground">High</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Max: {maxValue.toLocaleString()}
        </div>
      </div>
    </div>
  )
}

function getHeatColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity))
  
  if (t < 0.25) {
    return interpolateColor('#1a1a4e', '#0891b2', t * 4)
  } else if (t < 0.5) {
    return interpolateColor('#0891b2', '#eab308', (t - 0.25) * 4)
  } else if (t < 0.75) {
    return interpolateColor('#eab308', '#f97316', (t - 0.5) * 4)
  } else {
    return interpolateColor('#f97316', '#ef4444', (t - 0.75) * 4)
  }
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)
  
  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)
  
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
