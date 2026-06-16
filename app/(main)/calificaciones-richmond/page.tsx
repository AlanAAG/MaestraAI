'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Group = { id: string; name: string; grade: string }
type Assignment = { id: string; title: string; due_at: string }
type Score = {
  assignment_id: string
  richmond_student_id: string
  first_name: string
  last_name: string
  total_score: number | null
  done: boolean
}

export default function CalificacionesRichmondPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .single()
      if (!teacher) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: groupsData } = await (supabase as any)
        .from('groups')
        .select('id, name, grade')
        .eq('titular_teacher_id', teacher.id)
        .order('name')

      const list: Group[] = groupsData ?? []
      setGroups(list)
      if (list.length > 0) setSelectedGroup(list[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedGroup) return
    loadGroupData(selectedGroup)
  }, [selectedGroup])

  async function loadGroupData(groupId: string) {
    setLoading(true)
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignData } = await (supabase as any)
      .from('richmond_assignments')
      .select('id, title, due_at')
      .eq('group_id', groupId)
      .order('due_at', { ascending: false })
      .limit(20)

    const assignList: Assignment[] = assignData ?? []
    setAssignments(assignList)

    if (assignList.length === 0) {
      setScores([])
      setLoading(false)
      return
    }

    const assignIds = assignList.map((a) => a.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scoreData } = await (supabase as any)
      .from('richmond_scores')
      .select('assignment_id, richmond_student_id, first_name, last_name, total_score, done')
      .in('assignment_id', assignIds)

    setScores(scoreData ?? [])
    setLoading(false)
  }

  // Build student list from scores
  const studentMap = new Map<string, { first: string; last: string }>()
  for (const s of scores) {
    if (!studentMap.has(s.richmond_student_id)) {
      studentMap.set(s.richmond_student_id, { first: s.first_name, last: s.last_name })
    }
  }
  const students = Array.from(studentMap.entries()).sort((a, b) =>
    `${a[1].last}${a[1].first}`.localeCompare(`${b[1].last}${b[1].first}`)
  )

  // Score lookup
  const scoreKey = (assignId: string, studentId: string) =>
    scores.find((s) => s.assignment_id === assignId && s.richmond_student_id === studentId)

  function exportCsv() {
    const headers = ['Apellido', 'Nombre', ...assignments.map((a) => a.title.slice(0, 30))]
    const rows = students.map(([sid, { first, last }]) => [
      last,
      first,
      ...assignments.map((a) => {
        const s = scoreKey(a.id, sid)
        return s ? (s.total_score ?? (s.done ? 'Entregado' : '—')) : '—'
      }),
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `calificaciones-richmond-${selectedGroup}.csv`
    a.click()
  }

  const group = groups.find((g) => g.id === selectedGroup)

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calificaciones Richmond</h1>
          <p className="text-sm text-gray-500 mt-0.5">Últimas 20 tareas sincronizadas por grupo</p>
        </div>
        {students.length > 0 && (
          <Button variant="outline" onClick={exportCsv} className="min-h-[44px]">
            <Download size={16} className="mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Group selector */}
      {groups.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.grade})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="font-medium">Sin tareas sincronizadas</p>
          <p className="text-sm mt-1">
            {group
              ? `${group.name} no tiene datos de Richmond aún.`
              : 'Sincroniza desde la extensión de Chrome.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="sticky left-0 bg-muted px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap border-r border-border">
                  Alumno
                </th>
                {assignments.map((a) => (
                  <th
                    key={a.id}
                    className="px-3 py-3 text-center font-medium text-gray-600 max-w-[120px]"
                  >
                    <div className="truncate max-w-[110px]" title={a.title}>
                      {a.title}
                    </div>
                    <div className="text-xs font-normal text-gray-400">
                      {new Date(a.due_at).toLocaleDateString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map(([sid, { first, last }]) => (
                <tr key={sid} className="hover:bg-muted/40">
                  <td className="sticky left-0 bg-white hover:bg-muted/40 px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap border-r border-border">
                    {last}, {first}
                  </td>
                  {assignments.map((a) => {
                    const s = scoreKey(a.id, sid)
                    const score = s?.total_score
                    const colorClass =
                      score == null
                        ? 'text-gray-400'
                        : score >= 80
                          ? 'text-green-700 font-semibold'
                          : score >= 60
                            ? 'text-yellow-700'
                            : 'text-red-600'
                    return (
                      <td key={a.id} className={`px-3 py-2.5 text-center ${colorClass}`}>
                        {score != null ? score : s?.done ? '✓' : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
