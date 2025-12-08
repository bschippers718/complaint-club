import type { AggregateSummary } from './supabase'

// Weights for chaos score calculation
const WEIGHTS = {
  total: 0.5,
  noise: 0.2,
  rats: 0.15,
  parking: 0.1,
  trash: 0.05
}

// Normalization boundaries (these should be calibrated based on actual data)
const MAX_VALUES = {
  total: 5000,    // Max expected total complaints per neighborhood per month
  noise: 1500,    // Max expected noise complaints
  rats: 800,      // Max expected rat complaints
  parking: 1000,  // Max expected parking complaints
  trash: 500      // Max expected trash complaints
}

/**
 * Normalize a value to 0-100 scale
 */
function normalize(value: number, max: number): number {
  return Math.min(100, Math.round((value / max) * 100))
}

/**
 * Calculate the Chaos Score for a neighborhood
 * 
 * chaos_score = (normalized_total * 0.5) + (normalized_noise * 0.2) + 
 *               (normalized_rats * 0.15) + (normalized_parking * 0.1) + 
 *               (normalized_trash * 0.05)
 */
export function calculateChaosScore(data: {
  total: number
  noise: number
  rats: number
  parking: number
  trash: number
}): number {
  const normalizedTotal = normalize(data.total, MAX_VALUES.total)
  const normalizedNoise = normalize(data.noise, MAX_VALUES.noise)
  const normalizedRats = normalize(data.rats, MAX_VALUES.rats)
  const normalizedParking = normalize(data.parking, MAX_VALUES.parking)
  const normalizedTrash = normalize(data.trash, MAX_VALUES.trash)

  const score = 
    (normalizedTotal * WEIGHTS.total) +
    (normalizedNoise * WEIGHTS.noise) +
    (normalizedRats * WEIGHTS.rats) +
    (normalizedParking * WEIGHTS.parking) +
    (normalizedTrash * WEIGHTS.trash)

  return Math.round(Math.min(100, Math.max(0, score)))
}

/**
 * Get a descriptor for the chaos score
 */
export function getChaosDescriptor(score: number): {
  label: string
  color: string
  emoji: string
} {
  if (score >= 80) {
    return { label: 'Total Chaos', color: 'text-red-600', emoji: '🔥' }
  }
  if (score >= 60) {
    return { label: 'Very Chaotic', color: 'text-orange-500', emoji: '😱' }
  }
  if (score >= 40) {
    return { label: 'Chaotic', color: 'text-yellow-500', emoji: '😤' }
  }
  if (score >= 20) {
    return { label: 'Somewhat Calm', color: 'text-green-500', emoji: '😐' }
  }
  return { label: 'Peaceful', color: 'text-emerald-600', emoji: '😌' }
}

/**
 * Calculate chaos scores for all neighborhoods in a summary dataset
 */
export function calculateAllChaosScores(summaries: AggregateSummary[]): AggregateSummary[] {
  return summaries.map(summary => ({
    ...summary,
    chaos_score: calculateChaosScore({
      total: summary.total,
      noise: summary.noise,
      rats: summary.rats,
      parking: summary.parking,
      trash: summary.trash
    })
  }))
}

