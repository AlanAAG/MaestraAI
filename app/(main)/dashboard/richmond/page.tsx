'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Upload, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Assignment = {
  id: string
  title: string
  due_at: string
  total_students: number
  total_submitted: number
  class_avg_score: number | null
  synced_at: string
}

type SyncLog = {
  started_at: string
  status: string
  assignments_synced: number
  scores_synced: number
}

export default function RichmondDashboard() {
  const router = useRouter()
  const [activeGroup, setActiveGroup] = useState<'A' | 'B'>('A')
  const [assignmentsA, setAssignmentsA] = useState<Assignment[]>([])
  const [assignmentsB, setAssignmentsB] = useState<Assignment[]>([])
  const [lastSyncA, setLastSyncA] = useState<SyncLog | null>(null)
  const [lastSyncB, setLastSyncB] = useState<SyncLog | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const groupAId = '91000000-0000-0000-0000-000000000001'
  const groupBId = '92000000-0000-0000-0000-000000000002'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    // Load assignments for both groups
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignmentsDataA } = await (supabase as any)
      .from('richmond_assignments')
      .select('*')
      .eq('group_id', groupAId)
      .order('due_at', { ascending: false })
      .limit(20)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignmentsDataB } = await (supabase as any)
      .from('richmond_assignments')
      .select('*')
      .eq('group_id', groupBId)
      .order('due_at', { ascending: false })
      .limit(20)

    setAssignmentsA(assignmentsDataA || [])
    setAssignmentsB(assignmentsDataB || [])

    // Load last sync logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: syncLogA } = await (supabase as any)
      .from('richmond_sync_log')
      .select('*')
      .eq('group_id', groupAId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: syncLogB } = await (supabase as any)
      .from('richmond_sync_log')
      .select('*')
      .eq('group_id', groupBId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    setLastSyncA(syncLogA)
    setLastSyncB(syncLogB)

    // Check for session_expired status
    if (syncLogA?.status === 'session_expired' || syncLogB?.status === 'session_expired') {
      setSessionExpired(true)
    }
  }

  async function handleSync(groupId: string) {
    setSyncing(true)
    setSessionExpired(false)

    try {
      const response = await fetch('/api/richmond/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
      })

      const result = await response.json()

      if (response.status === 401 && result.error === 'session_expired') {
        setSessionExpired(true)
        alert('La sesión de Richmond expiró. Por favor, reconecta.')
      } else if (response.ok) {
        alert(`✓ Sincronización exitosa: ${result.synced} calificaciones`)
        await loadData()
      } else {
        alert(`Error: ${result.message || 'No se pudo sincronizar'}`)
      }
    } catch {
      alert('Error de red al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  // CSV import now handled via /richmond/subir route
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleUploadXLSX(groupId: string) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls,.csv'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('group_id', groupId)

        const response = await fetch('/api/richmond/upload-xlsx', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (response.ok) {
          alert(`✓ ${result.synced} calificaciones importadas desde XLSX`)
          await loadData()
        } else {
          alert(`Error: ${result.error}`)
        }
      } catch {
        alert('Error al subir archivo')
      }
    }

    input.click()
  }

  const activeGroupId = activeGroup === 'A' ? groupAId : groupBId
  const assignments = activeGroup === 'A' ? assignmentsA : assignmentsB
  const lastSync = activeGroup === 'A' ? lastSyncA : lastSyncB

  const submissionRate =
    assignments.length > 0
      ? Math.round(
          (assignments.reduce((sum, a) => sum + a.total_submitted, 0) /
            assignments.reduce((sum, a) => sum + a.total_students, 0)) *
            100
        )
      : 0

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Richmond Sync</h1>
          <p className="text-sm text-text-secondary mt-1">
            Calificaciones sincronizadas desde Richmond LP
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/richmond/subir')}
            variant="outline"
            className="min-h-[44px] gap-2"
          >
            <Upload size={18} />
            Importar CSV
          </Button>
          <Button
            onClick={() => handleSync(activeGroupId)}
            disabled={syncing}
            className="min-h-[44px] gap-2 bg-primary hover:bg-primary-dark"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </Button>
        </div>
      </div>

      {sessionExpired && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Sesión de Richmond expirada</p>
            <p className="text-sm text-red-700 mt-1">
              Por favor, inicia sesión en richmondlp.com y vuelve al Markbook para reconectar.
            </p>
          </div>
        </div>
      )}

      {/* Group tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveGroup('A')}
          className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors ${
            activeGroup === 'A'
              ? 'bg-primary text-white'
              : 'bg-surface text-text-secondary hover:bg-primary-light'
          }`}
        >
          Grupo A
        </button>
        <button
          onClick={() => setActiveGroup('B')}
          className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors ${
            activeGroup === 'B'
              ? 'bg-primary text-white'
              : 'bg-surface text-text-secondary hover:bg-primary-light'
          }`}
        >
          Grupo B
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-text-secondary mb-1">Última sincronización</p>
          <p className="text-lg font-semibold text-text-primary">
            {lastSync ? formatDate(lastSync.started_at) : 'Nunca'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary mb-1">Total de tareas</p>
          <p className="text-lg font-semibold text-text-primary">{assignments.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary mb-1">Tasa de entrega</p>
          <p className="text-lg font-semibold text-text-primary">{submissionRate}%</p>
        </Card>
      </div>

      {/* Assignments table */}
      <Card className="p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 text-sm font-semibold text-text-secondary">
                Tarea
              </th>
              <th className="text-left py-3 px-2 text-sm font-semibold text-text-secondary">
                Fecha límite
              </th>
              <th className="text-center py-3 px-2 text-sm font-semibold text-text-secondary">
                Entregadas
              </th>
              <th className="text-center py-3 px-2 text-sm font-semibold text-text-secondary">
                Promedio
              </th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-text-secondary">
                  No hay tareas sincronizadas
                </td>
              </tr>
            ) : (
              assignments.map((assignment) => {
                const isOverdue = new Date(assignment.due_at) < new Date()
                const submissionPercent = Math.round(
                  (assignment.total_submitted / assignment.total_students) * 100
                )

                return (
                  <tr key={assignment.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary">{assignment.title}</span>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            Vencida
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-text-secondary">
                      {formatDate(assignment.due_at)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="text-sm text-text-primary">
                        {assignment.total_submitted} / {assignment.total_students}
                      </div>
                      <div className="text-xs text-text-secondary">{submissionPercent}%</div>
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-text-primary">
                      {assignment.class_avg_score
                        ? `${assignment.class_avg_score.toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
