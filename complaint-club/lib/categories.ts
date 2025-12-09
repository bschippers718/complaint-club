// Category type definitions
export type Category = 'rats' | 'noise' | 'parking' | 'trash' | 'heat_water' | 'construction' | 'building' | 'bikes' | 'other'

export const CATEGORIES: Category[] = ['rats', 'noise', 'parking', 'trash', 'heat_water', 'construction', 'building', 'bikes', 'other']

// Category display configuration
export const CATEGORY_CONFIG: Record<Category, { 
  label: string
  icon: string
  color: string
  bgColor: string
  description: string
}> = {
  rats: {
    label: 'Rats',
    icon: '🐀',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    description: 'Rodent sightings'
  },
  noise: {
    label: 'Noise',
    icon: '🔊',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Noise complaints'
  },
  parking: {
    label: 'Parking',
    icon: '🚗',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Parking violations'
  },
  trash: {
    label: 'Trash',
    icon: '🗑️',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Sanitation issues'
  },
  heat_water: {
    label: 'Heat/Water',
    icon: '🔥',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    description: 'Utilities issues'
  },
  construction: {
    label: 'Construction',
    icon: '🚧',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    description: 'Construction noise & permits'
  },
  building: {
    label: 'Building',
    icon: '🏚️',
    color: 'text-stone-600',
    bgColor: 'bg-stone-100',
    description: 'Unsafe buildings & violations'
  },
  bikes: {
    label: 'Bikes',
    icon: '🚴',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    description: 'Bike & scooter issues'
  },
  other: {
    label: 'Other',
    icon: '📋',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    description: 'Other complaints'
  }
}

// Map NYC 311 complaint types to our categories
export function mapComplaintTypeToCategory(complaintType: string): Category {
  const type = complaintType.toLowerCase()
  
  // Rodent complaints
  if (type.includes('rodent') || type.includes('rat') || type.includes('mouse') || type.includes('mice')) {
    return 'rats'
  }
  
  // Construction complaints (check before noise since some overlap)
  if (type.includes('construction') ||
      type.includes('after hours') ||
      type.includes('building permit') ||
      type.includes('crane') ||
      type.includes('sidewalk shed') ||
      type.includes('scaffolding') ||
      type.includes('work permit') ||
      type.includes('demolition') ||
      type.includes('excavation')) {
    return 'construction'
  }
  
  // Building violations and unsafe conditions
  if (type.includes('unsafe') ||
      type.includes('illegal conversion') ||
      type.includes('building condition') ||
      type.includes('elevator') ||
      type.includes('lead') ||
      type.includes('mold') ||
      type.includes('structural') ||
      type.includes('fire safety') ||
      type.includes('vacant building') ||
      type.includes('illegal apartment') ||
      type.includes('certificate of occupancy') ||
      type.includes('building violation') ||
      type.includes('hpd') ||
      type.includes('maintenance')) {
    return 'building'
  }
  
  // Bikes and scooters
  if (type.includes('bike') ||
      type.includes('bicycle') ||
      type.includes('scooter') ||
      type.includes('e-bike') ||
      type.includes('ebike') ||
      type.includes('citibike') ||
      type.includes('citi bike') ||
      type.includes('revel') ||
      type.includes('blocked bike lane') ||
      type.includes('bike lane')) {
    return 'bikes'
  }
  
  // Noise complaints (expanded, but without construction)
  if (type.includes('noise') || 
      type.includes('loud') ||
      type.includes('barking') ||
      type.includes('music') ||
      type.includes('party') ||
      (type.includes('alarm') && !type.includes('fire alarm')) ||
      type.includes('siren') ||
      (type.includes('air conditioner') && type.includes('noise')) ||
      (type.includes('air conditioning') && type.includes('noise')) ||
      type.includes('generator') ||
      type.includes('amplified') ||
      (type.includes('vehicle') && (type.includes('horn') || type.includes('car alarm')))) {
    return 'noise'
  }
  
  // Parking violations
  if (type.includes('parking') || 
      type.includes('blocked driveway') ||
      type.includes('blocked hydrant') ||
      type.includes('blocked fire lane') ||
      type.includes('double parked') ||
      type.includes('posted parking') ||
      type.includes('illegal parking') ||
      type.includes('fire hydrant') ||
      (type.includes('hydrant') && !type.includes('catch basin')) ||
      (type.includes('vehicle') && (type.includes('blocked') || type.includes('illegal') || type.includes('parked')) && !type.includes('abandoned'))) {
    return 'parking'
  }
  
  // Sanitation/Trash
  if (type.includes('sanitation') || 
      type.includes('trash') || 
      type.includes('garbage') || 
      type.includes('litter') || 
      type.includes('dirty') || 
      type.includes('graffiti') ||
      type.includes('unsanitary') ||
      type.includes('dumping') ||
      type.includes('illegal dump') ||
      type.includes('missed collection') ||
      type.includes('derelict') ||
      type.includes('abandoned vehicle') ||
      type.includes('dead animal') ||
      type.includes('street condition') ||
      type.includes('overflowing') ||
      type.includes('receptacle') ||
      type.includes('sidewalk condition') ||
      type.includes('dumpster') ||
      type.includes('pothole') ||
      type.includes('street light') ||
      type.includes('streetlight') ||
      type.includes('tree') ||
      type.includes('broken glass') ||
      type.includes('broken bottle') ||
      type.includes('hazardous') ||
      type.includes('debris') ||
      type.includes('waste') ||
      type.includes('refuse') ||
      type.includes('collection') ||
      type.includes('bulk') ||
      (type.includes('furniture') && type.includes('street'))) {
    return 'trash'
  }
  
  // Heat/Hot Water/Plumbing
  if (type.includes('heat') || 
      type.includes('hot water') || 
      type.includes('water system') ||
      type.includes('water leak') ||
      type.includes('water main') ||
      type.includes('plumbing') || 
      type.includes('boiler') ||
      type.includes('radiator') ||
      type.includes('no heat') ||
      type.includes('sewer') ||
      type.includes('catch basin') ||
      type.includes('gas') ||
      type.includes('electric') ||
      type.includes('electrical') ||
      type.includes('power') ||
      type.includes('steam') ||
      type.includes('heating') ||
      type.includes('hvac') ||
      (type.includes('air conditioner') && !type.includes('noise')) ||
      (type.includes('air conditioning') && !type.includes('noise'))) {
    return 'heat_water'
  }
  
  // Everything else
  return 'other'
}

// Timeframe options
export type Timeframe = 'today' | 'week' | 'month' | 'all'

export const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: '90 Days' }
]
