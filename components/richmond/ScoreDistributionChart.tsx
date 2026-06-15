'use client'
import { motion } from 'framer-motion'
import type { ScoreBucket } from '@/lib/richmond/analytics'

interface ScoreDistributionChartProps {
  distribution: ScoreBucket[]
  avg: number | null
  median: number | null
  mode: number | null
  totalScored: number
}

function StatPill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-muted border border-border">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-lg font-semibold text-text-primary">
        {value !== null ? value.toFixed(1) : '—'}
      </span>
    </div>
  )
}

export function ScoreDistributionChart({
  distribution,
  avg,
  median,
  mode,
  totalScored,
}: ScoreDistributionChartProps) {
  const maxCount = Math.max(...distribution.map((b) => b.count), 1)

  return (
    <div className="space-y-4">
      <div className="flex gap-3 justify-center flex-wrap">
        <StatPill label="Media" value={avg} />
        <StatPill label="Mediana" value={median} />
        <StatPill label="Moda" value={mode} />
      </div>

      {totalScored === 0 ? (
        <p className="text-center text-sm text-text-secondary py-4">Sin datos registrados</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary">{totalScored} registros</p>
          {distribution.map((bucket, i) => {
            const pct = totalScored > 0 ? (bucket.count / totalScored) * 100 : 0
            const barW = (bucket.count / maxCount) * 100

            return (
              <div key={bucket.bucket} className="space-y-1">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>{bucket.bucket}</span>
                  <span>
                    {bucket.count} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-6 bg-muted rounded overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500 rounded"
                    initial={{ width: 0 }}
                    animate={{ width: `${barW}%` }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
