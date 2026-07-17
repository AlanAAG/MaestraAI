'use client'
import { useMemo } from 'react'

type AssignmentScore = {
  date: string
  assignment_title: string
  internal_value: number | null
  source: 'richmond' | 'manual'
  qualitative: string
  done: boolean
}

type StudentProgressChartProps = {
  assignments: AssignmentScore[]
}

export function StudentProgressChart({ assignments }: StudentProgressChartProps) {
  // Filter only completed assignments
  const completedAssignments = useMemo(() => assignments.filter((a) => a.done), [assignments])

  // Group by qualitative level
  const qualitativeCounts = useMemo(() => {
    const counts = {
      Logrado: 0,
      'En proceso': 0,
      'Requiere apoyo': 0,
      'Sin evaluar': 0,
    }

    completedAssignments.forEach((a) => {
      if (a.qualitative in counts) {
        counts[a.qualitative as keyof typeof counts]++
      }
    })

    return counts
  }, [completedAssignments])

  const total = completedAssignments.length
  const maxCount = Math.max(...Object.values(qualitativeCounts))

  if (completedAssignments.length === 0) {
    return (
      <div className="text-center text-text-secondary py-12">
        <p>No hay datos suficientes para mostrar el gráfico</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-text-secondary">
        Vista consolidada de {completedAssignments.length} trabajos completados
      </div>

      {/* Bar chart representation */}
      <div className="space-y-4">
        {Object.entries(qualitativeCounts).map(([level, count]) => {
          if (count === 0) return null

          const percentage = total > 0 ? (count / total) * 100 : 0
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0

          const colorClass =
            {
              Logrado: 'bg-success',
              'En proceso': 'bg-warning',
              'Requiere apoyo': 'bg-error',
              'Sin evaluar': 'bg-text-muted',
            }[level] || 'bg-text-muted'

          return (
            <div key={level} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text-primary">{level}</span>
                <span className="text-text-secondary">{count} trabajos</span>
              </div>
              <div className="h-8 bg-inset rounded-lg overflow-hidden">
                <div
                  className={`h-full ${colorClass} transition-all duration-500 flex items-center justify-end pr-3`}
                  style={{ width: `${barWidth}%` }}
                >
                  {barWidth > 15 && (
                    <span className="text-xs font-semibold text-white">
                      {percentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Timeline view */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Línea de tiempo</h3>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {completedAssignments
            .slice()
            .reverse()
            .map((assignment, index) => {
              const colorClass =
                {
                  Logrado: 'bg-success-light text-success-text border-success/30',
                  'En proceso': 'bg-warning-light text-warning-text border-warning/30',
                  'Requiere apoyo': 'bg-error-light text-error-text border-error/30',
                  'Sin evaluar': 'bg-inset text-text-secondary border-border',
                }[assignment.qualitative] || 'bg-inset text-text-secondary border-border'

              return (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-muted-foreground w-20 flex-shrink-0">
                    {new Date(assignment.date).toLocaleDateString('es-MX', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex-1 truncate text-text-secondary">
                    {assignment.assignment_title}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${colorClass} flex-shrink-0`}
                  >
                    {assignment.qualitative}
                  </span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
