import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getChaosDescriptor } from '@/lib/chaos-score'
import { CATEGORY_CONFIG, type Category } from '@/lib/categories'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const neighborhoodId = parseInt(id)

  if (isNaN(neighborhoodId)) {
    return new Response('Invalid neighborhood ID', { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Fetch neighborhood data
    const { data: details, error } = await supabase.rpc('get_neighborhood_detail', {
      p_neighborhood_id: neighborhoodId
    })

    if (error || !details || details.length === 0) {
      return new Response('Neighborhood not found', { status: 404 })
    }

    // Get month stats
    const monthData = details.find((d: { timeframe: string }) => d.timeframe === 'month') || details[0]
    const chaosInfo = getChaosDescriptor(monthData.chaos_score)

    // Find top category
    const categories = [
      { cat: 'rats' as Category, count: monthData.rats },
      { cat: 'noise' as Category, count: monthData.noise },
      { cat: 'parking' as Category, count: monthData.parking },
      { cat: 'trash' as Category, count: monthData.trash },
      { cat: 'heat_water' as Category, count: monthData.heat_water },
      { cat: 'other' as Category, count: monthData.other }
    ].sort((a, b) => b.count - a.count)

    const topCategories = categories.filter(c => c.count > 0).slice(0, 4)

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1625',
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99, 179, 237, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)',
            padding: '60px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '30px',
            }}
          >
            <span style={{ fontSize: '40px', marginRight: '12px' }}>🗽</span>
            <span
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #63b3ed, #ec4899)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Complaint Club
            </span>
          </div>

          {/* Neighborhood Name */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            {monthData.name}
          </div>

          {/* Borough */}
          <div
            style={{
              fontSize: '28px',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '40px',
            }}
          >
            {monthData.borough}
          </div>

          {/* Stats Row */}
          <div
            style={{
              display: 'flex',
              gap: '60px',
              marginBottom: '40px',
            }}
          >
            {/* Rank */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                RANK
              </div>
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 'bold',
                  color: monthData.rank_in_city <= 3 ? '#fbbf24' : '#63b3ed',
                }}
              >
                #{monthData.rank_in_city || '—'}
              </div>
            </div>

            {/* Total Complaints */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                COMPLAINTS
              </div>
              <div style={{ fontSize: '56px', fontWeight: 'bold', color: 'white' }}>
                {monthData.total.toLocaleString()}
              </div>
            </div>

            {/* Chaos Score */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                CHAOS SCORE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '48px' }}>{chaosInfo.emoji}</span>
                <span
                  style={{
                    fontSize: '56px',
                    fontWeight: 'bold',
                    color: getChaosColor(monthData.chaos_score),
                  }}
                >
                  {monthData.chaos_score}
                </span>
              </div>
            </div>
          </div>

          {/* Category Pills */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: '40px',
            }}
          >
            {topCategories.map(({ cat, count }) => (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '999px',
                  fontSize: '24px',
                }}
              >
                <span>{CATEGORY_CONFIG[cat].icon}</span>
                <span style={{ color: 'white' }}>{count.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.4)',
              marginTop: 'auto',
            }}
          >
            This Month • complaintclub.nyc
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Share card error:', error)
    return new Response('Failed to generate share card', { status: 500 })
  }
}

function getChaosColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f97316'
  if (score >= 40) return '#eab308'
  if (score >= 20) return '#22c55e'
  return '#10b981'
}

