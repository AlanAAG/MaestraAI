'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ZeroState } from '@/components/app/ZeroState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, Search, AlertCircle, MessageCircle, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface Student {
  id: string
  name: string
  has_nee: boolean
  group_id: string
  group_name: string
  group_grade: string
  richmond_student_id?: string | null
  observation_day?: string | null
  has_contact: boolean
}

interface Group {
  id: string
  name: string
  grade: string
}

interface LoadingState {
  status: 'idle' | 'loading' | 'error' | 'success'
  error?: string
}

export default function AlumnosPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingState, setLoadingState] = useState<LoadingState>({ status: 'loading' })
  const [contactLoading, setContactLoading] = useState<string | null>(null)

  // Manual add-student
  const [showAdd, setShowAdd] = useState(false)
  const [addFirst, setAddFirst] = useState('')
  const [addLast, setAddLast] = useState('')
  const [addGroupId, setAddGroupId] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  async function handleAddStudent() {
    if (!addFirst.trim() || !addLast.trim() || !addGroupId) return
    setAddSaving(true)
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: addGroupId,
          first_name: addFirst.trim(),
          last_name: addLast.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Alumno agregado')
      setAddFirst('')
      setAddLast('')
      setShowAdd(false)
      loadData()
    } catch {
      toast.error('No pude agregar al alumno.')
    } finally {
      setAddSaving(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, selectedGroupId, searchQuery])

  async function loadData() {
    setLoadingState({ status: 'loading' })
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setLoadingState({
          status: 'error',
          error: 'No se pudo verificar tu identidad. Por favor recarga la página.',
        })
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher, error: teacherError } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (teacherError || !teacher) {
        setLoadingState({
          status: 'error',
          error: 'No se encontró tu perfil. Por favor completa la configuración.',
        })
        return
      }

      // Load teacher's groups
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: groupsData, error: groupsError } = await (supabase as any)
        .from('groups')
        .select('id, name, grade')
        .eq('titular_teacher_id', teacher.id)
        .order('name')

      if (groupsError) {
        setLoadingState({
          status: 'error',
          error: 'Error al cargar los grupos. Intenta de nuevo.',
        })
        return
      }

      setGroups(groupsData || [])

      // Names are encrypted at rest — fetch via the server route that decrypts them.
      const res = await fetch('/api/students?group_id=all')
      if (!res.ok) {
        setLoadingState({
          status: 'error',
          error: 'Error al cargar los alumnos. Intenta de nuevo.',
        })
        return
      }
      const { students: studentsData } = await res.json()
      setStudents(studentsData || [])
      setLoadingState({ status: 'success' })
    } catch (err) {
      console.error('Unexpected error loading students:', err)
      setLoadingState({
        status: 'error',
        error: 'Algo salió mal. Por favor intenta de nuevo más tarde.',
      })
    }
  }

  async function handleWhatsApp(e: React.MouseEvent, studentId: string) {
    e.stopPropagation()
    setContactLoading(studentId)
    try {
      const res = await fetch(`/api/students/${studentId}/contact`)
      if (res.ok) {
        const { wa_url } = await res.json()
        window.open(wa_url, '_blank')
      }
    } finally {
      setContactLoading(null)
    }
  }

  function filterStudents() {
    let filtered = students

    // Filter by group
    if (selectedGroupId !== 'all') {
      filtered = filtered.filter((s) => s.group_id === selectedGroupId)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(query))
    }

    setFilteredStudents(filtered)
  }

  // Loading skeleton
  if (loadingState.status === 'loading') {
    return (
      <div className="p-8">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse mb-6" />
        <div className="flex gap-4 mb-6">
          <div className="h-10 w-48 rounded-lg bg-muted animate-pulse" />
          <div className="h-10 flex-1 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-3">
                <div className="h-6 w-32 rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded-lg bg-muted animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (loadingState.status === 'error') {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">No se pudo cargar</h3>
              <p className="text-sm text-destructive/80 mb-4">{loadingState.error}</p>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  onClick={() => loadData()}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Intentar de nuevo
                </Button>
                <Button size="sm" variant="outline" onClick={() => router.push('/dashboard')}>
                  Volver al inicio
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (students.length === 0) {
    return (
      <div className="p-8">
        <ZeroState
          icon={Users}
          title="No hay alumnos registrados"
          description="Agrega estudiantes desde Configuración o sincroniza con Richmond para verlos aquí"
          ctaLabel="Ir a Configuración"
          onCta={() => router.push('/configuracion')}
        />
      </div>
    )
  }

  // Success state - list of students
  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Alumnos</h1>
          <p className="text-sm text-text-secondary mt-1">
            {filteredStudents.length} {filteredStudents.length === 1 ? 'alumno' : 'alumnos'}
          </p>
        </div>
        {groups.length > 0 && (
          <Button
            className="min-h-[44px] shrink-0"
            onClick={() => {
              setAddGroupId(selectedGroupId !== 'all' ? selectedGroupId : (groups[0]?.id ?? ''))
              setShowAdd(true)
            }}
          >
            <Plus size={16} className="mr-2" />
            Agregar alumno
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Group filter */}
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="h-10 px-3 py-2 rounded-lg border border-input bg-background text-sm
            focus:outline-none focus:ring-2 focus:ring-primary min-w-[160px]"
        >
          <option value="all">Todos los grupos</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} - {group.grade}
            </option>
          ))}
        </select>

        {/* Search input */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
      </div>

      {/* Student cards grid */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <Users size={48} className="mx-auto mb-4 opacity-40" />
          <p>No se encontraron alumnos con esos filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student, index) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card
                onClick={() => router.push(`/alumnos/${student.id}`)}
                className="p-6 cursor-pointer hover:shadow-lg active:shadow-md transition-all duration-200
                  hover:border-primary/30 focus-within:ring-2 focus-within:ring-primary"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(`/alumnos/${student.id}`)
                  }
                }}
                aria-label={`Ver perfil de ${student.name}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-text-primary truncate">
                      {student.name}
                    </h3>
                    {student.has_nee && (
                      <span
                        className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex-shrink-0"
                        title="Estudiante con Necesidades Educativas Especiales"
                      >
                        NEE
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-text-secondary">
                      {student.group_name} - {student.group_grade}
                    </p>
                    {student.richmond_student_id && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-xs text-text-secondary">
                          Sincronizado con Richmond
                        </span>
                      </div>
                    )}
                  </div>
                  {student.has_contact && (
                    <button
                      onClick={(e) => handleWhatsApp(e, student.id)}
                      disabled={contactLoading === student.id}
                      className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 transition-colors mt-1"
                    >
                      <MessageCircle size={13} />
                      {contactLoading === student.id ? 'Abriendo...' : 'WhatsApp'}
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Manual add-student modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !addSaving && setShowAdd(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Agregar alumno</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="text-text-disabled hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-text-secondary">
              Un nombre y un apellido. Se normaliza y se vincula con Richmond automáticamente al
              sincronizar.
            </p>
            <select
              value={addGroupId}
              onChange={(e) => setAddGroupId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} - {g.grade}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre"
                value={addFirst}
                onChange={(e) => setAddFirst(e.target.value)}
              />
              <Input
                placeholder="Apellido"
                value={addLast}
                onChange={(e) => setAddLast(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAddStudent}
              disabled={addSaving || !addFirst.trim() || !addLast.trim() || !addGroupId}
              className="w-full"
            >
              {addSaving ? 'Agregando...' : 'Agregar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
