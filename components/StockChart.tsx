'use client'

import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts'

export interface StockChartPoint {
  label: string
  value: number
}

/**
 * The single source of truth for a company's price line. The participant
 * trading floor renders the `compact` variant; the big-screen market view
 * renders the `screen` variant (taller, labelled axis) — same chart, same
 * green/red logic, just sized for a projector.
 */
export default function StockChart({
  data,
  isUp,
  variant = 'compact',
}: {
  data: StockChartPoint[]
  isUp: boolean
  variant?: 'compact' | 'screen'
}) {
  const color = isUp ? '#22c55e' : '#ff5470'

  if (variant === 'screen') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 14, bottom: 4, left: -16 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 14, fill: 'rgba(255,255,255,0.45)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
          <Tooltip
            contentStyle={{
              background: 'rgba(10,11,14,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.75rem',
              fontSize: '0.9rem',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
            formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Price']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // Compact variant — identical to the original trading-floor sparkline.
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
