'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  Upload,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  PuzzleIcon,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ScoreDistributionChart } from '@/components/richmond/ScoreDistributionChart'

const EDITORIAL_NAMES: Record<string, string> = {
  richmond: 'Richmond LP',
  macmillan: 'Macmillan Education',
  pearson: 'Pearson',
}

type TabView = 'todos' | 'por-grupo' | 'por-tarea' | 'por-alumno'
type Group = { id: string; name: string; richmond_group_name: string | null }
type GroupOverview = {
  id: string
  name: string
  assignment_count: number
  avg_score: number | null
  completion_rate: number | null
}
type AssignmentSummary = {
  id: string
  title: string
  due_at: string
  total_students: number
  total_submitted: number
  class_avg_score: number | null
  synced_at: string
}
type AssignmentDetail = {
  assignment: {
    id: string
    title: string
    due_at: string
    total_students: number
    total_submitted: number
  }
  stats: {
    avg: number | null
    median: number | null
    mode: number | null
    completion_rate: number
    distribution: { bucket: string; count: number }[]
  }
  scores: { student_display_name: string | null; total_score: number | null; done: boolean }[]
}
type StudentScore = {
  assignment_title: string
  assigned_at: string
  total_score: number | null
  done: boolean
}
type Student = { id: string; name: string }
type SyncLog = { started_at: string; status: string }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function TabBtn({
  id,
  active,
  onClick,
  children,
}: {
  id: TabView
  active: boolean
  onClick: (t: TabView) => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-primary-light'
      }`}
    >
      {children}
    </button>
  )
}

export default function RichmondDashboard() {
  const router = useRouter()

  const [teacher, setTeacher] = useState<{ editorial?: string } | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [activeTab, setActiveTab] = useState<TabView>('todos')

  // Tab-specific state
  const [overview, setOverview] = useState<GroupOverview[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupAssignments, setGroupAssignments] = useState<AssignmentSummary[]>([])
  const [lastSync, setLastSync] = useState<SyncLog | null>(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [assignmentDetail, setAssignmentDetail] = useState<AssignmentDetail | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentHistory, setStudentHistory] = useState<StudentScore[]>([])
  const [studentName, setStudentName] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Load teacher + groups on mount
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: t } = await supabase
        .from('teachers')
        .select('id, editorial')
        .eq('auth_id', user.id)
        .single()
      setTeacher(t)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: g } = await (supabase as any)
        .from('groups')
        .select('id, name, richmond_group_name')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('titular_teacher_id', (t as any)?.id)
        .order('name')
      const grps: Group[] = g || []
      setGroups(grps)
      if (grps.length) setSelectedGroupId(grps[0].id)
    }
    init()
  }, [router])

  // Load overview when groups are ready
  useEffect(() => {
    if (!groups.length) return
    loadOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups])

  // Load group data when selectedGroupId changes (for por-grupo tab)
  const loadGroupData = useCallback(async (groupId: string) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const [analyticsRes, syncRes, credsRes] = await Promise.all([
        fetch(`/api/richmond/analytics?group_id=${groupId}`),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('richmond_sync_log')
          .select('started_at, status')
          .eq('group_id', groupId)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        // Check stored session validity — proactive, no external call needed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('richmond_credentials')
          .select('is_valid')
          .eq('group_id', groupId)
          .maybeSingle(),
      ])
      const { assignments } = await analyticsRes.json()
      setGroupAssignments(assignments || [])
      setLastSync(syncRes.data || null)
      // Session is expired if the credentials row says so, OR the last sync log says so
      const credInvalid = credsRes.data && credsRes.data.is_valid === false
      const logExpired = syncRes.data?.status === 'session_expired'
      setSessionExpired(credInvalid || logExpired)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'por-grupo' && selectedGroupId) loadGroupData(selectedGroupId)
  }, [activeTab, selectedGroupId, loadGroupData])

  // Load students when por-alumno tab + group selected
  useEffect(() => {
    if (activeTab !== 'por-alumno' || !selectedGroupId) return
    async function fetchStudents() {
      // Names are encrypted at rest — fetch decrypted via the server route.
      const res = await fetch(`/api/students?group_id=${selectedGroupId}`)
      const { students: data } = res.ok ? await res.json() : { students: [] }
      setStudents(data || [])
      setSelectedStudentId(null)
      setStudentHistory([])
    }
    fetchStudents()
  }, [activeTab, selectedGroupId])

  async function loadOverview() {
    setLoading(true)
    try {
      const res = await fetch('/api/richmond/analytics')
      const { overview: ov } = await res.json()
      setOverview(ov || [])
    } finally {
      setLoading(false)
    }
  }

  async function loadAssignmentDetail(assignmentId: string) {
    setLoading(true)
    setAssignmentDetail(null)
    try {
      const res = await fetch(`/api/richmond/analytics?assignment_id=${assignmentId}`)
      const data = await res.json()
      setAssignmentDetail(data)
    } finally {
      setLoading(false)
    }
  }

  async function loadStudentHistory(studentId: string) {
    setLoading(true)
    setStudentHistory([])
    try {
      const res = await fetch(`/api/richmond/analytics?student_id=${studentId}`)
      const data = await res.json()
      setStudentHistory(data.scores || [])
      setStudentName(data.student_name || '')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    if (!selectedGroupId) return
    setSyncing(true)
    setSessionExpired(false)
    try {
      const res = await fetch('/api/richmond/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: selectedGroupId }),
      })
      const result = await res.json()
      if (res.status === 401 && result.error === 'session_expired') {
        setSessionExpired(true)
      } else if (res.ok) {
        await loadGroupData(selectedGroupId)
        if (activeTab === 'todos') await loadOverview()
      }
    } finally {
      setSyncing(false)
    }
  }

  const editorialName = teacher?.editorial
    ? EDITORIAL_NAMES[teacher.editorial] || teacher.editorial
    : 'Editorial'

  const activeGroupName =
    groups.find((g) => g.id === selectedGroupId)?.richmond_group_name ||
    groups.find((g) => g.id === selectedGroupId)?.name ||
    'Grupo'

  // Build flat assignment list for the "por-tarea" selector (from overview + group data)
  const allAssignmentsForSelector = groupAssignments

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{editorialName}</h1>
          <p className="text-sm text-text-secondary mt-1">
            Datos sincronizados desde {editorialName}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.open('https://richmondlp.com', '_blank', 'noopener')}
            className="min-h-[44px] gap-2"
          >
            <ExternalLink size={18} /> Ir a Richmond
          </Button>
          <Button
            onClick={() => router.push('/richmond/subir')}
            variant="outline"
            className="min-h-[44px] gap-2"
          >
            <Upload size={18} /> Importar CSV
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing || !selectedGroupId || sessionExpired}
            className="min-h-[44px] gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing
              ? 'Sincronizando...'
              : sessionExpired
                ? 'Sesión expirada'
                : `Sincronizar${activeGroupName ? ` ${activeGroupName}` : ''}`}
          </Button>
        </div>
      </div>

      {sessionExpired && (
        <div className="mb-6 p-4 rounded-xl bg-error-light border border-error flex items-start gap-3">
          <AlertCircle size={20} className="text-error mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-error-text">Sesión de Richmond expirada</p>
            <p className="text-sm text-error-text mt-1">
              Para volver a sincronizar:{' '}
              <a
                href="https://richmondlp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                abre richmondlp.com
              </a>
              , inicia sesión, y con la extensión de MaestraIA activa abre el Markbook de tu grupo.
              Cuando la extensión detecte la sesión, el botón de sincronizar se reactivará.
            </p>
          </div>
        </div>
      )}

      {/* Extension linkage banner — only shown when no assignment data has ever been synced */}
      {!loading && groups.length > 0 && overview.length === 0 && !sessionExpired && (
        <div className="mb-6 p-4 rounded-xl bg-warning-light border border-warning flex items-start gap-3">
          <PuzzleIcon size={20} className="text-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-warning-text">Extensión no configurada</p>
            <p className="text-sm text-warning-text mt-0.5">
              Abre la extensión de MaestraIA en Chrome, inicia sesión en richmondlp.com y sincroniza
              tu Markbook para vincular tus grupos.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <TabBtn id="todos" active={activeTab === 'todos'} onClick={setActiveTab}>
          Todos los grupos
        </TabBtn>
        <TabBtn id="por-grupo" active={activeTab === 'por-grupo'} onClick={setActiveTab}>
          Por grupo
        </TabBtn>
        <TabBtn id="por-tarea" active={activeTab === 'por-tarea'} onClick={setActiveTab}>
          Por tarea
        </TabBtn>
        <TabBtn id="por-alumno" active={activeTab === 'por-alumno'} onClick={setActiveTab}>
          Por alumno
        </TabBtn>
      </div>

      {/* ── Todos ──────────────────────────────────────────────────────── */}
      {activeTab === 'todos' && (
        <Card className="p-6">
          {loading ? (
            <p className="text-sm text-text-secondary py-8 text-center">Cargando...</p>
          ) : overview.length === 0 ? (
            <p className="text-sm text-text-secondary py-8 text-center">
              Sin datos. Abre el Markbook en Richmond para sincronizar.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-text-secondary">
                    Grupo
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-text-secondary">
                    Tareas
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-text-secondary">
                    Media
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-text-secondary">
                    Entrega
                  </th>
                  <th className="py-3 px-2" />
                </tr>
              </thead>
              <tbody>
                {overview.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                    onClick={() => {
                      setSelectedGroupId(g.id)
                      setActiveTab('por-grupo')
                    }}
                  >
                    <td className="py-3 px-2 text-sm font-medium text-text-primary">{g.name}</td>
                    <td className="py-3 px-2 text-center text-sm text-text-secondary">
                      {g.assignment_count}
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-text-secondary">
                      {g.avg_score !== null ? g.avg_score.toFixed(1) : '—'}
                    </td>
                    <td className="py-3 px-2 text-center text-sm text-text-secondary">
                      {g.completion_rate !== null
                        ? `${(g.completion_rate * 100).toFixed(0)}%`
                        : '—'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <ChevronRight size={16} className="text-text-secondary inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── Por grupo ──────────────────────────────────────────────────── */}
      {activeTab === 'por-grupo' && (
        <div className="space-y-4">
          {/* Group selector */}
          <div className="flex gap-2 flex-wrap">
            {groups.map((g) => {
              const linked = !!g.richmond_group_name
              const active = selectedGroupId === g.id
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGroupId(g.id)
                    loadGroupData(g.id)
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm transition-colors ${
                    active
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-text-secondary hover:border-primary'
                  }`}
                >
                  {g.richmond_group_name || g.name}
                  {linked ? (
                    <CheckCircle2 size={14} className={active ? 'text-white/80' : 'text-success'} />
                  ) : (
                    <span title="Grupo sin vincular — abre la extensión">
                      <PuzzleIcon size={14} className={active ? 'text-white/70' : 'text-warning'} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Stats row */}
          {lastSync && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <p className="text-xs text-text-secondary mb-1">Última sincronización</p>
                <p className="text-sm font-semibold text-text-primary">
                  {formatDate(lastSync.started_at)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-text-secondary mb-1">Total tareas</p>
                <p className="text-sm font-semibold text-text-primary">{groupAssignments.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-text-secondary mb-1">Entrega promedio</p>
                <p className="text-sm font-semibold text-text-primary">
                  {groupAssignments.length > 0
                    ? `${Math.round((groupAssignments.reduce((s, a) => s + a.total_submitted, 0) / groupAssignments.reduce((s, a) => s + (a.total_students || 1), 0)) * 100)}%`
                    : '—'}
                </p>
              </Card>
            </div>
          )}

          <Card className="p-6">
            {loading ? (
              <p className="text-sm text-text-secondary py-8 text-center">Cargando...</p>
            ) : (
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
                      Media
                    </th>
                    <th className="py-3 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {groupAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-text-secondary">
                        Sin tareas sincronizadas
                      </td>
                    </tr>
                  ) : (
                    groupAssignments.map((a) => {
                      const isOverdue = new Date(a.due_at) < new Date()
                      const pct =
                        a.total_students > 0
                          ? Math.round((a.total_submitted / a.total_students) * 100)
                          : 0
                      return (
                        <tr
                          key={a.id}
                          className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                          onClick={() => {
                            setSelectedAssignmentId(a.id)
                            setActiveTab('por-tarea')
                            loadAssignmentDetail(a.id)
                          }}
                        >
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-text-primary">{a.title}</span>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                  Vencida
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm text-text-secondary">
                            {formatDate(a.due_at)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="text-sm text-text-primary">
                              {a.total_submitted} / {a.total_students}
                            </div>
                            <div className="text-xs text-text-secondary">{pct}%</div>
                          </td>
                          <td className="py-3 px-2 text-center text-sm text-text-secondary">
                            {a.class_avg_score !== null ? a.class_avg_score.toFixed(1) : '—'}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <ChevronRight size={16} className="text-text-secondary inline-block" />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* ── Por tarea ──────────────────────────────────────────────────── */}
      {activeTab === 'por-tarea' && (
        <div className="space-y-4">
          {/* Group → Assignment selectors */}
          <div className="flex gap-3 flex-wrap items-center">
            <select
              value={selectedGroupId || ''}
              onChange={async (e) => {
                setSelectedGroupId(e.target.value)
                setSelectedAssignmentId(null)
                setAssignmentDetail(null)
                await loadGroupData(e.target.value)
              }}
              className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.richmond_group_name || g.name}
                </option>
              ))}
            </select>
            <select
              value={selectedAssignmentId || ''}
              onChange={(e) => {
                setSelectedAssignmentId(e.target.value)
                loadAssignmentDetail(e.target.value)
              }}
              className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary flex-1 min-w-[200px]"
              disabled={allAssignmentsForSelector.length === 0}
            >
              <option value="">Selecciona una tarea...</option>
              {allAssignmentsForSelector.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          {loading && <p className="text-sm text-text-secondary text-center py-8">Cargando...</p>}

          {assignmentDetail && !loading && (
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-base font-semibold text-text-primary mb-1">
                  {assignmentDetail.assignment.title}
                </h3>
                <p className="text-xs text-text-secondary mb-4">
                  Fecha límite: {formatDate(assignmentDetail.assignment.due_at)} ·{' '}
                  {assignmentDetail.assignment.total_submitted} /{' '}
                  {assignmentDetail.assignment.total_students} entregadas
                </p>
                <ScoreDistributionChart
                  distribution={assignmentDetail.stats.distribution}
                  avg={assignmentDetail.stats.avg}
                  median={assignmentDetail.stats.median}
                  mode={assignmentDetail.stats.mode}
                  totalScored={assignmentDetail.scores.filter((s) => s.total_score !== null).length}
                />
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-semibold text-text-secondary mb-3">
                  Detalle por alumno
                </h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">
                        Alumno
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-secondary">
                        Resultado
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-secondary">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentDetail.scores.map((s, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2 px-2 text-sm text-text-primary">
                          {s.student_display_name || '—'}
                        </td>
                        <td className="py-2 px-2 text-center text-sm text-text-secondary">
                          {s.total_score !== null ? s.total_score.toFixed(1) : '—'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${s.done ? 'bg-success-light text-success-text' : 'bg-inset text-text-muted'}`}
                          >
                            {s.done ? 'Entregado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {!assignmentDetail && !loading && (
            <Card className="p-12 text-center">
              <p className="text-sm text-text-secondary">
                Selecciona un grupo y una tarea para ver el análisis
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ── Por alumno ─────────────────────────────────────────────────── */}
      {activeTab === 'por-alumno' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <select
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.richmond_group_name || g.name}
                </option>
              ))}
            </select>
            <select
              value={selectedStudentId || ''}
              onChange={(e) => {
                setSelectedStudentId(e.target.value)
                loadStudentHistory(e.target.value)
              }}
              className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary flex-1 min-w-[200px]"
              disabled={students.length === 0}
            >
              <option value="">Selecciona un alumno...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {loading && <p className="text-sm text-text-secondary text-center py-8">Cargando...</p>}

          {selectedStudentId && !loading && (
            <Card className="p-6">
              {studentName && (
                <h3 className="text-base font-semibold text-text-primary mb-4">{studentName}</h3>
              )}
              {studentHistory.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4">
                  Sin registros para este alumno
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">
                        Tarea
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">
                        Fecha
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-secondary">
                        Resultado
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-secondary">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentHistory.map((s, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2 px-2 text-sm text-text-primary">
                          {s.assignment_title}
                        </td>
                        <td className="py-2 px-2 text-sm text-text-secondary">
                          {formatDate(s.assigned_at)}
                        </td>
                        <td className="py-2 px-2 text-center text-sm text-text-secondary">
                          {s.total_score !== null ? s.total_score.toFixed(1) : '—'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${s.done ? 'bg-success-light text-success-text' : 'bg-inset text-text-muted'}`}
                          >
                            {s.done ? 'Entregado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {!selectedStudentId && !loading && (
            <Card className="p-12 text-center">
              <p className="text-sm text-text-secondary">
                Selecciona un grupo y un alumno para ver su historial
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
