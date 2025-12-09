// Mock data for demo/development without Supabase connection

import type { Category } from './categories'

export interface MockLeaderboardEntry {
  rank: number
  neighborhood_id: number
  neighborhood_name: string
  borough: string
  total: number
  chaos_score: number
  category_counts: Record<Category, number>
}

export const MOCK_LEADERBOARD: MockLeaderboardEntry[] = [
  {
    rank: 1,
    neighborhood_id: 1,
    neighborhood_name: "Washington Heights",
    borough: "Manhattan",
    total: 4823,
    chaos_score: 87,
    category_counts: { rats: 412, noise: 1456, parking: 892, trash: 623, heat_water: 540, construction: 320, building: 180, bikes: 200, other: 200 }
  },
  {
    rank: 2,
    neighborhood_id: 2,
    neighborhood_name: "Bedford-Stuyvesant",
    borough: "Brooklyn",
    total: 4512,
    chaos_score: 82,
    category_counts: { rats: 534, noise: 1123, parking: 1102, trash: 712, heat_water: 341, construction: 280, building: 220, bikes: 100, other: 100 }
  },
  {
    rank: 3,
    neighborhood_id: 3,
    neighborhood_name: "Astoria",
    borough: "Queens",
    total: 4201,
    chaos_score: 78,
    category_counts: { rats: 389, noise: 1267, parking: 956, trash: 589, heat_water: 400, construction: 350, building: 150, bikes: 50, other: 50 }
  },
  {
    rank: 4,
    neighborhood_id: 4,
    neighborhood_name: "East Harlem",
    borough: "Manhattan",
    total: 3987,
    chaos_score: 75,
    category_counts: { rats: 567, noise: 934, parking: 678, trash: 723, heat_water: 485, construction: 200, building: 250, bikes: 50, other: 100 }
  },
  {
    rank: 5,
    neighborhood_id: 5,
    neighborhood_name: "Bushwick",
    borough: "Brooklyn",
    total: 3756,
    chaos_score: 72,
    category_counts: { rats: 445, noise: 1045, parking: 789, trash: 534, heat_water: 343, construction: 300, building: 150, bikes: 100, other: 50 }
  },
  {
    rank: 6,
    neighborhood_id: 6,
    neighborhood_name: "Crown Heights",
    borough: "Brooklyn",
    total: 3542,
    chaos_score: 69,
    category_counts: { rats: 398, noise: 934, parking: 867, trash: 456, heat_water: 287, construction: 250, building: 200, bikes: 100, other: 50 }
  },
  {
    rank: 7,
    neighborhood_id: 7,
    neighborhood_name: "Jackson Heights",
    borough: "Queens",
    total: 3421,
    chaos_score: 67,
    category_counts: { rats: 312, noise: 1156, parking: 734, trash: 423, heat_water: 296, construction: 200, building: 150, bikes: 100, other: 50 }
  },
  {
    rank: 8,
    neighborhood_id: 8,
    neighborhood_name: "South Bronx",
    borough: "Bronx",
    total: 3298,
    chaos_score: 65,
    category_counts: { rats: 523, noise: 687, parking: 567, trash: 612, heat_water: 409, construction: 150, building: 250, bikes: 50, other: 50 }
  },
  {
    rank: 9,
    neighborhood_id: 9,
    neighborhood_name: "Williamsburg",
    borough: "Brooklyn",
    total: 3156,
    chaos_score: 62,
    category_counts: { rats: 287, noise: 1045, parking: 678, trash: 389, heat_water: 257, construction: 250, building: 100, bikes: 100, other: 50 }
  },
  {
    rank: 10,
    neighborhood_id: 10,
    neighborhood_name: "Flatbush",
    borough: "Brooklyn",
    total: 2987,
    chaos_score: 58,
    category_counts: { rats: 345, noise: 823, parking: 623, trash: 412, heat_water: 284, construction: 200, building: 200, bikes: 50, other: 50 }
  },
  {
    rank: 11,
    neighborhood_id: 11,
    neighborhood_name: "Upper West Side",
    borough: "Manhattan",
    total: 2876,
    chaos_score: 55,
    category_counts: { rats: 234, noise: 934, parking: 589, trash: 345, heat_water: 274, construction: 200, building: 100, bikes: 150, other: 50 }
  },
  {
    rank: 12,
    neighborhood_id: 12,
    neighborhood_name: "Harlem",
    borough: "Manhattan",
    total: 2765,
    chaos_score: 53,
    category_counts: { rats: 398, noise: 745, parking: 512, trash: 423, heat_water: 287, construction: 150, building: 150, bikes: 50, other: 50 }
  },
  {
    rank: 13,
    neighborhood_id: 13,
    neighborhood_name: "Flushing",
    borough: "Queens",
    total: 2654,
    chaos_score: 51,
    category_counts: { rats: 267, noise: 823, parking: 534, trash: 378, heat_water: 252, construction: 200, building: 100, bikes: 50, other: 50 }
  },
  {
    rank: 14,
    neighborhood_id: 14,
    neighborhood_name: "Prospect Heights",
    borough: "Brooklyn",
    total: 2543,
    chaos_score: 48,
    category_counts: { rats: 212, noise: 767, parking: 523, trash: 345, heat_water: 296, construction: 200, building: 100, bikes: 50, other: 50 }
  },
  {
    rank: 15,
    neighborhood_id: 15,
    neighborhood_name: "Inwood",
    borough: "Manhattan",
    total: 2432,
    chaos_score: 45,
    category_counts: { rats: 298, noise: 612, parking: 456, trash: 389, heat_water: 277, construction: 150, building: 150, bikes: 50, other: 50 }
  }
]

export const MOCK_NEIGHBORHOODS = MOCK_LEADERBOARD.map(e => ({
  id: e.neighborhood_id,
  name: e.neighborhood_name,
  borough: e.borough
}))

export function getMockNeighborhoodDetail(id: number) {
  const entry = MOCK_LEADERBOARD.find(e => e.neighborhood_id === id)
  if (!entry) return null

  // Generate trend data for last 30 days
  const trends = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    const variance = 0.7 + Math.random() * 0.6 // 70-130% of daily average
    const dailyTotal = Math.round((entry.total / 30) * variance)
    
    return {
      date: date.toISOString().split('T')[0],
      total: dailyTotal,
      rats: Math.round((entry.category_counts.rats / 30) * variance),
      noise: Math.round((entry.category_counts.noise / 30) * variance),
      parking: Math.round((entry.category_counts.parking / 30) * variance),
      trash: Math.round((entry.category_counts.trash / 30) * variance),
      heat_water: Math.round((entry.category_counts.heat_water / 30) * variance),
      construction: Math.round((entry.category_counts.construction / 30) * variance),
      building: Math.round((entry.category_counts.building / 30) * variance),
      bikes: Math.round((entry.category_counts.bikes / 30) * variance),
      other: Math.round((entry.category_counts.other / 30) * variance)
    }
  })

  // Find top category (excluding 'other')
  const categories = (Object.entries(entry.category_counts) as [Category, number][])
    .filter(([cat]) => cat !== 'other')
  const topCategory = categories.sort((a, b) => b[1] - a[1])[0]

  return {
    id: entry.neighborhood_id,
    name: entry.neighborhood_name,
    borough: entry.borough,
    chaos_score: entry.chaos_score,
    chaos_label: entry.chaos_score >= 80 ? 'Total Chaos' : entry.chaos_score >= 60 ? 'Very Chaotic' : entry.chaos_score >= 40 ? 'Chaotic' : 'Somewhat Calm',
    chaos_emoji: entry.chaos_score >= 80 ? '🔥' : entry.chaos_score >= 60 ? '😱' : entry.chaos_score >= 40 ? '😤' : '😐',
    top_category: topCategory[0],
    top_category_count: topCategory[1],
    stats: {
      today: scaleStats(entry, 0.03),
      week: scaleStats(entry, 0.25),
      month: { ...entry.category_counts, total: entry.total, rank: entry.rank },
      all: scaleStats(entry, 12)
    },
    trends,
    insights: generateInsights(entry)
  }
}

function scaleStats(entry: MockLeaderboardEntry, factor: number) {
  return {
    total: Math.round(entry.total * factor),
    rats: Math.round(entry.category_counts.rats * factor),
    noise: Math.round(entry.category_counts.noise * factor),
    parking: Math.round(entry.category_counts.parking * factor),
    trash: Math.round(entry.category_counts.trash * factor),
    heat_water: Math.round(entry.category_counts.heat_water * factor),
    construction: Math.round(entry.category_counts.construction * factor),
    building: Math.round(entry.category_counts.building * factor),
    bikes: Math.round(entry.category_counts.bikes * factor),
    other: Math.round(entry.category_counts.other * factor),
    rank: entry.rank
  }
}

function generateInsights(entry: MockLeaderboardEntry): string[] {
  const insights: string[] = []
  
  if (entry.rank <= 3) {
    insights.push(`🏆 ${entry.neighborhood_name} is one of NYC's top 3 complaint hotspots!`)
  } else if (entry.rank <= 10) {
    insights.push(`🔥 ${entry.neighborhood_name} ranks #${entry.rank} in NYC for complaints`)
  }

  const categories = (Object.entries(entry.category_counts) as [string, number][])
    .filter(([cat]) => cat !== 'other')
  const topCat = categories.sort((a, b) => b[1] - a[1])[0]
  const topPct = Math.round((topCat[1] / entry.total) * 100)
  
  const catLabels: Record<string, string> = {
    rats: 'Rats', noise: 'Noise', parking: 'Parking', 
    trash: 'Trash', heat_water: 'Heat/Water', 
    construction: 'Construction', building: 'Building', bikes: 'Bikes', other: 'Other'
  }
  
  insights.push(`${catLabels[topCat[0]]} complaints make up ${topPct}% of all issues`)

  if (entry.category_counts.rats > 400) {
    insights.push(`🐀 ${entry.category_counts.rats} rat sightings this month - watch your step!`)
  }

  if (entry.category_counts.noise > 1000) {
    insights.push(`🔊 High noise complaints - consider earplugs if you're apartment hunting here`)
  }

  if (entry.category_counts.construction > 250) {
    insights.push(`🚧 Major construction activity - expect dust and delays`)
  }

  if (entry.category_counts.bikes > 100) {
    insights.push(`🚴 High bike/scooter complaint area - stay alert on sidewalks`)
  }

  return insights.slice(0, 4)
}

export function getMockCompareData(leftId: number, rightId: number) {
  const left = MOCK_LEADERBOARD.find(e => e.neighborhood_id === leftId)
  const right = MOCK_LEADERBOARD.find(e => e.neighborhood_id === rightId)
  
  if (!left || !right) return null

  const categoryWinners: Record<Category, 'left' | 'right' | 'tie'> = {
    rats: left.category_counts.rats > right.category_counts.rats ? 'left' : left.category_counts.rats < right.category_counts.rats ? 'right' : 'tie',
    noise: left.category_counts.noise > right.category_counts.noise ? 'left' : left.category_counts.noise < right.category_counts.noise ? 'right' : 'tie',
    parking: left.category_counts.parking > right.category_counts.parking ? 'left' : left.category_counts.parking < right.category_counts.parking ? 'right' : 'tie',
    trash: left.category_counts.trash > right.category_counts.trash ? 'left' : left.category_counts.trash < right.category_counts.trash ? 'right' : 'tie',
    heat_water: left.category_counts.heat_water > right.category_counts.heat_water ? 'left' : left.category_counts.heat_water < right.category_counts.heat_water ? 'right' : 'tie',
    construction: left.category_counts.construction > right.category_counts.construction ? 'left' : left.category_counts.construction < right.category_counts.construction ? 'right' : 'tie',
    building: left.category_counts.building > right.category_counts.building ? 'left' : left.category_counts.building < right.category_counts.building ? 'right' : 'tie',
    bikes: left.category_counts.bikes > right.category_counts.bikes ? 'left' : left.category_counts.bikes < right.category_counts.bikes ? 'right' : 'tie',
    other: left.category_counts.other > right.category_counts.other ? 'left' : left.category_counts.other < right.category_counts.other ? 'right' : 'tie'
  }

  return {
    left: {
      id: left.neighborhood_id,
      name: left.neighborhood_name,
      borough: left.borough,
      total: left.total,
      chaos_score: left.chaos_score,
      rank: left.rank,
      category_counts: left.category_counts
    },
    right: {
      id: right.neighborhood_id,
      name: right.neighborhood_name,
      borough: right.borough,
      total: right.total,
      chaos_score: right.chaos_score,
      rank: right.rank,
      category_counts: right.category_counts
    },
    winner: left.total > right.total ? 'left' as const : left.total < right.total ? 'right' as const : 'tie' as const,
    category_winners: categoryWinners,
    timeframe: 'month' as const
  }
}

export const MOCK_NEARBY_COMPLAINTS = [
  { id: '1', category: 'noise' as Category, type: 'Loud Music/Party', description: 'Loud party on 3rd floor', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), distance_meters: 45, neighborhood: 'Williamsburg' },
  { id: '2', category: 'rats' as Category, type: 'Rodent', description: 'Rat seen near garbage', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), distance_meters: 120, neighborhood: 'Williamsburg' },
  { id: '3', category: 'parking' as Category, type: 'Blocked Driveway', description: 'Car blocking driveway', created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), distance_meters: 89, neighborhood: 'Williamsburg' },
  { id: '4', category: 'trash' as Category, type: 'Dirty Sidewalk', description: 'Garbage overflow on sidewalk', created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), distance_meters: 234, neighborhood: 'Williamsburg' },
  { id: '5', category: 'construction' as Category, type: 'Construction', description: 'Construction noise before 7am', created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), distance_meters: 156, neighborhood: 'Williamsburg' },
  { id: '6', category: 'heat_water' as Category, type: 'No Hot Water', description: 'No hot water in building', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), distance_meters: 312, neighborhood: 'Williamsburg' },
  { id: '7', category: 'rats' as Category, type: 'Rodent', description: 'Multiple rats in alley', created_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), distance_meters: 178, neighborhood: 'Williamsburg' },
  { id: '8', category: 'bikes' as Category, type: 'Bike on Sidewalk', description: 'E-bikes riding on sidewalk', created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), distance_meters: 267, neighborhood: 'Williamsburg' },
]
