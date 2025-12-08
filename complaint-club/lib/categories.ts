// Category type definitions
export type Category = 'rats' | 'noise' | 'parking' | 'trash' | 'heat_water' | 'other'

export const CATEGORIES: Category[] = ['rats', 'noise', 'parking', 'trash', 'heat_water', 'other']

// Category display configuration
export const CATEGORY_CONFIG: Record<Category, { 
  label: string
  icon: string
  color: string
  bgColor: string
}> = {
  rats: {
    label: 'Rats',
    icon: '🐀',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  },
  noise: {
    label: 'Noise',
    icon: '🔊',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  parking: {
    label: 'Parking',
    icon: '🚗',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  trash: {
    label: 'Trash',
    icon: '🗑️',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  heat_water: {
    label: 'Heat/Water',
    icon: '🔥',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  other: {
    label: 'Other',
    icon: '📋',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  }
}

// Map NYC 311 complaint types to our categories
export function mapComplaintTypeToCategory(complaintType: string): Category {
  const type = complaintType.toLowerCase()
  
  // Rodent complaints
  if (type.includes('rodent') || type.includes('rat') || type.includes('mouse') || type.includes('mice')) {
    return 'rats'
  }
  
  // Noise complaints
  if (type.includes('noise') || type.includes('loud')) {
    return 'noise'
  }
  
  // Parking violations (expanded)
  if (type.includes('parking') || 
      type.includes('blocked driveway') ||
      type.includes('blocked hydrant') ||
      type.includes('double parked') ||
      type.includes('posted parking')) {
    return 'parking'
  }
  
  // Sanitation/Trash (expanded significantly)
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
      type.includes('dumpster')) {
    return 'trash'
  }
  
  // Heat/Hot Water/Plumbing (expanded)
  if (type.includes('heat') || 
      type.includes('hot water') || 
      type.includes('water system') ||
      type.includes('water leak') ||
      type.includes('plumbing') || 
      type.includes('boiler') ||
      type.includes('radiator') ||
      type.includes('no heat') ||
      type.includes('sewer') ||
      type.includes('catch basin')) {
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

