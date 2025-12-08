'use client'

import { getChaosDescriptor } from '@/lib/chaos-score'
import { cn } from '@/lib/utils'

interface ChaosGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export function ChaosGauge({ score, size = 'md' }: ChaosGaugeProps) {
  const info = getChaosDescriptor(score)
  
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-48 h-48'
  }

  const textSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl'
  }

  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  // Calculate rotation for the gauge indicator (0-100 maps to -90 to 90 degrees)
  const rotation = -90 + (score / 100) * 180

  return (
    <div className={cn('relative', sizeClasses[size])}>
      {/* Background arc */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="chaos-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.70 0.20 145)" />
            <stop offset="25%" stopColor="oklch(0.75 0.20 85)" />
            <stop offset="50%" stopColor="oklch(0.70 0.22 45)" />
            <stop offset="75%" stopColor="oklch(0.65 0.24 25)" />
            <stop offset="100%" stopColor="oklch(0.60 0.28 15)" />
          </linearGradient>
        </defs>
        
        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="141.37 282.74"
          className="text-muted"
        />
        
        {/* Progress arc */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#chaos-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 141.37} 282.74`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl mb-1">{info.emoji}</span>
        <span className={cn('font-bold font-mono', textSizes[size], info.color)}>
          {score}
        </span>
        <span className={cn('text-muted-foreground', labelSizes[size])}>
          {info.label}
        </span>
      </div>
    </div>
  )
}

