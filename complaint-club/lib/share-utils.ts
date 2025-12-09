import { Category, CATEGORY_CONFIG } from './categories'

export interface ShareData {
  neighborhoodName: string
  neighborhoodId: number
  borough: string
  rank: number
  total: number
  chaosScore: number
  categoryCounts: Record<Category, number>
  timeframe: string
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://311complaints.nyc'

/**
 * Generate a shareable URL for a neighborhood
 */
export function getNeighborhoodUrl(neighborhoodId: number, category?: Category): string {
  const url = `${BASE_URL}/n/${neighborhoodId}`.trim()
  return category ? `${url}?highlight=${category}`.trim() : url
}

/**
 * Generate a shareable URL for the leaderboard with a category filter
 */
export function getLeaderboardUrl(category?: Category): string {
  return category ? `${BASE_URL}/?category=${category}` : BASE_URL
}

/**
 * Get the top categories sorted by count
 */
export function getTopCategories(categoryCounts: Record<Category, number>, limit = 3): Array<{ category: Category; count: number }> {
  return Object.entries(categoryCounts)
    .filter(([cat]) => cat !== 'other')
    .map(([category, count]) => ({ category: category as Category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Generate the main share text for a neighborhood
 */
export function generateShareText(data: ShareData): string {
  const topCategories = getTopCategories(data.categoryCounts, 3)
  const url = getNeighborhoodUrl(data.neighborhoodId)
  
  const categoryLines = topCategories
    .filter(c => c.count > 0)
    .map(c => `${CATEGORY_CONFIG[c.category].icon} ${c.count.toLocaleString()} ${CATEGORY_CONFIG[c.category].label.toLowerCase()}`)
    .join('\n')

  const chaosEmoji = data.chaosScore >= 80 ? '🔥' : data.chaosScore >= 60 ? '😱' : data.chaosScore >= 40 ? '😤' : '😐'

  // Put URL on its own line with blank lines around it to prevent breaking when pasted
  return `🗽 ${data.neighborhoodName} is #${data.rank} in NYC for complaints!

${categoryLines}

Chaos Score: ${data.chaosScore}/100 ${chaosEmoji}

${url}`
}

/**
 * Generate a short share text for SMS/Twitter
 */
export function generateShortShareText(data: ShareData): string {
  const topCategory = getTopCategories(data.categoryCounts, 1)[0]
  const url = getNeighborhoodUrl(data.neighborhoodId)
  
  if (topCategory && topCategory.count > 0) {
    return `🗽 ${data.neighborhoodName} is #${data.rank} for ${CATEGORY_CONFIG[topCategory.category].label.toLowerCase()} complaints in NYC! ${CATEGORY_CONFIG[topCategory.category].icon} ${url}`
  }
  
  return `🗽 ${data.neighborhoodName} is #${data.rank} in NYC with ${data.total.toLocaleString()} complaints! ${url}`
}

/**
 * Generate share text for a specific category
 */
export function generateCategoryShareText(
  neighborhoodName: string,
  neighborhoodId: number,
  category: Category,
  count: number,
  rank?: number
): string {
  const config = CATEGORY_CONFIG[category]
  const url = getNeighborhoodUrl(neighborhoodId, category)
  
  const rankText = rank ? ` (#${rank} in NYC)` : ''
  
  return `${config.icon} ${neighborhoodName} has ${count.toLocaleString()} ${config.label.toLowerCase()} complaints this month${rankText}!

See more: ${url}`
}

/**
 * Generate email subject for sharing
 */
export function generateEmailSubject(data: ShareData): string {
  return `🗽 ${data.neighborhoodName} is #${data.rank} in NYC for complaints!`
}

/**
 * Generate email body for sharing
 */
export function generateEmailBody(data: ShareData): string {
  return generateShareText(data) + '\n\n---\nSent from Complaint Club - NYC 311 Complaint Leaderboard'
}

/**
 * Generate SMS/iMessage text
 */
export function generateSmsText(data: ShareData): string {
  return generateShortShareText(data)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

/**
 * Open SMS app with pre-filled text
 */
export function openSms(text: string): void {
  const smsUrl = `sms:?&body=${encodeURIComponent(text)}`
  window.open(smsUrl, '_blank')
}

/**
 * Open email client with pre-filled subject and body
 */
export function openEmail(subject: string, body: string): void {
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(mailtoUrl, '_blank')
}

/**
 * Share via Web Share API (mobile)
 */
export async function nativeShare(data: ShareData): Promise<boolean> {
  if (!navigator.share) {
    return false
  }
  
  try {
    await navigator.share({
      title: `${data.neighborhoodName} - Complaint Club`,
      text: generateShortShareText(data),
      url: getNeighborhoodUrl(data.neighborhoodId)
    })
    return true
  } catch {
    return false
  }
}

/**
 * Check if native sharing is available
 */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share
}

/**
 * Generate a fun superlative for the neighborhood
 */
export function getNeighborhoodSuperlative(data: ShareData): string | null {
  const topCategory = getTopCategories(data.categoryCounts, 1)[0]
  
  if (!topCategory || topCategory.count === 0) return null
  
  const superlatives: Record<Category, string | null> = {
    rats: `🐀 ${data.neighborhoodName} is NYC's #${data.rank} rattiest neighborhood!`,
    noise: `🔊 ${data.neighborhoodName} is NYC's #${data.rank} loudest neighborhood!`,
    parking: `🚗 ${data.neighborhoodName} is NYC's #${data.rank} worst for parking chaos!`,
    trash: `🗑️ ${data.neighborhoodName} is NYC's #${data.rank} trashiest neighborhood!`,
    heat_water: `🔥 ${data.neighborhoodName} is NYC's #${data.rank} worst for heat/water issues!`,
    construction: `🚧 ${data.neighborhoodName} is NYC's #${data.rank} most under construction!`,
    building: `🏚️ ${data.neighborhoodName} is NYC's #${data.rank} worst for building violations!`,
    bikes: `🚴 ${data.neighborhoodName} is NYC's #${data.rank} worst for bike/scooter chaos!`,
    other: null
  }
  
  return superlatives[topCategory.category] || null
}

