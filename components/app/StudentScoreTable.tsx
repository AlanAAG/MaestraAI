'use client'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

type AssignmentScore = {
  date: string
  assignment_title: string
  internal_value: number | null
  source: 'richmond' | 'manual'
  qualitative: string
  done: boolean
}

type StudentScoreTableProps = {
  assignments: AssignmentScore[]
  studentName: string
}

export function StudentScoreTable({ assignments, studentName }: StudentScoreTableProps) {
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const sortedAssignments = useMemo(() => {
    const sorted = [...assignments].sort((a, b) => {
      if (sortBy === 'date') {
        return sortDirection === 'asc'
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime()
      } else {
        return sortDirection === 'asc'
          ? a.assignment_title.localeCompare(b.assignment_title)
          : b.assignment_title.localeCompare(a.assignment_title)
      }
    })
    return sorted
  }, [assignments, sortBy, sortDirection])

  function toggleSort(column: 'date' | 'title') {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('desc')
    }
  }

  function exportToCSV() {
    const headers = ['Fecha', 'Trabajo', 'Evaluación', 'Estado', 'Fuente']
    const rows = sortedAssignments.map((a) => [
      new Date(a.date).toLocaleDateString('es-MX'),
      a.assignment_title,
      a.qualitative,
      a.done ? 'Completado' : 'Pendiente',
      a.source === 'richmond' ? 'Richmond' : 'Manual',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `historial-${studentName.replace(/\s+/g, '-')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center text-text-secondary py-12">
        <p>No hay trabajos registrados</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{assignments.length} trabajos registrados</p>
        <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
          <Download size={16} />
          Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th
                className="text-left p-3 text-sm font-semibold text-text-primary cursor-pointer hover:bg-muted"
                onClick={() => toggleSort('date')}
              >
                Fecha {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="text-left p-3 text-sm font-semibold text-text-primary cursor-pointer hover:bg-muted"
                onClick={() => toggleSort('title')}
              >
                Trabajo {sortBy === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left p-3 text-sm font-semibold text-text-primary">Evaluación</th>
              <th className="text-left p-3 text-sm font-semibold text-text-primary">Estado</th>
              <th className="text-left p-3 text-sm font-semibold text-text-primary">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {sortedAssignments.map((assignment, index) => {
              const qualitativeColorClass =
                {
                  Logrado: 'bg-green-100 text-green-700 border-green-200',
                  'En proceso': 'bg-yellow-100 text-yellow-700 border-yellow-200',
                  'Requiere apoyo': 'bg-orange-100 text-orange-700 border-orange-200',
                  'Sin evaluar': 'bg-gray-100 text-gray-700 border-gray-200',
                }[assignment.qualitative] || 'bg-gray-100 text-gray-700 border-gray-200'

              return (
                <tr key={index} className="border-b border-border hover:bg-muted/50">
                  <td className="p-3 text-sm text-text-secondary">
                    {new Date(assignment.date).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="p-3 text-sm text-text-primary">{assignment.assignment_title}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${qualitativeColorClass}`}
                    >
                      {assignment.qualitative}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-text-secondary">
                    {assignment.done ? (
                      <span className="text-success">Completado</span>
                    ) : (
                      <span className="text-muted-foreground">Pendiente</span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-text-secondary">
                    {assignment.source === 'richmond' ? (
                      <span className="text-primary">Richmond</span>
                    ) : (
                      <span>Manual</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
