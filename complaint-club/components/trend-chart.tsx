'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { CATEGORY_CONFIG, type Category } from '@/lib/categories'

interface TrendData {
  date: string
  total: number
  rats: number
  noise: number
  parking: number
  trash: number
  heat_water: number
  construction: number
  building: number
  bikes: number
  other: number
}

interface TrendChartProps {
  data: TrendData[]
  showCategories?: boolean
}

const CATEGORY_COLORS: Record<Category, string> = {
  rats: '#d97706',       // amber
  noise: '#9333ea',      // purple
  parking: '#2563eb',    // blue
  trash: '#16a34a',      // green
  heat_water: '#dc2626', // red
  construction: '#ea580c', // orange
  building: '#78716c',   // stone
  bikes: '#06b6d4',      // cyan
  other: '#6b7280'       // gray
}

export function TrendChart({ data, showCategories = false }: TrendChartProps) {
  // Format dates for display
  const formattedData = data.map(d => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }))

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="dateLabel" 
            stroke="rgba(255,255,255,0.5)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.5)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'oklch(0.16 0.02 280)',
              border: '1px solid oklch(0.30 0.03 280)',
              borderRadius: '8px',
              color: 'white'
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
          />
          
          {showCategories ? (
            <>
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => {
                  const cat = value as Category
                  return CATEGORY_CONFIG[cat]?.label || value
                }}
              />
              {Object.keys(CATEGORY_COLORS).map((cat) => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={CATEGORY_COLORS[cat as Category]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </>
          ) : (
            <Line
              type="monotone"
              dataKey="total"
              stroke="oklch(0.75 0.18 195)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: 'oklch(0.75 0.18 195)' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
