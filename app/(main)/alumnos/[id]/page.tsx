'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Download, AlertCircle, Users, MessageCircle } from 'lucide-react'
import { StudentProgressChart } from '@/components/app/StudentProgressChart'
import { StudentScoreTable } from '@/components/app/StudentScoreTable'

interface Student {
  id: string
  name: string
  has_nee: boolean
  group_id: string
  observation_day?: string | null
  richmond_student_id?: string | null
  has_contact: boolean
  group_name: string
  group_grade: string
}

interface AssignmentScore {
  date: string
  assignment_title: string
  internal_value: number | null
  source: 'richmond' | 'manual'
  qualitative: string
  done: boolean
}

interface ProgressData {
  assignments: AssignmentScore[]
  fortnights: Array<{
    number: number
    project_name: string
    start_date: string
    end_date: string
  }>
  observations: Array<{
    observed_date: string
    lesson_plan_id: string
  }>
}

interface LoadingState {
  status: 'idle' | 'loading' | 'error' | 'success'
  error?: string
}

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [student, setStudent] = useState<Student | null>(null)
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [loadingState, setLoadingState] = useState<LoadingState>({ status: 'loading' })
  const [downloadingReport, setDownloadingReport] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)

  useEffect(() => {
    if (studentId) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

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
          error: 'No se pudo verificar tu identidad.',
        })
        return
      }

      // Names are encrypted at rest — fetch via the server route that decrypts them.
      const studentRes = await fetch(`/api/students/${studentId}`)
      if (!studentRes.ok) {
        setLoadingState({ status: 'error', error: 'No se encontró el alumno.' })
        return
      }
      const studentData = await studentRes.json()
      setStudent(studentData)

      // Load progress data from API
      const response = await fetch(`/api/students/${studentId}/progress`)
      if (!response.ok) {
        throw new Error('Error al cargar el progreso')
      }

      const progress = await response.json()
      setProgressData(progress)
      setLoadingState({ status: 'success' })
    } catch (err) {
      console.error('Unexpected error loading student data:', err)
      setLoadingState({
        status: 'error',
        error: 'Error al cargar los datos del alumno.',
      })
    }
  }

  async function downloadReport() {
    if (!student) return

    setDownloadingReport(true)
    try {
      const response = await fetch(`/api/students/${studentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trimester: getCurrentTrimester(),
        }),
      })

      if (!response.ok) {
        throw new Error('Error al generar el reporte')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-${student.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error downloading report:', err)
      alert('No se pudo descargar el reporte. Intenta de nuevo.')
    } finally {
      setDownloadingReport(false)
    }
  }

  async function handleWhatsApp() {
    setContactLoading(true)
    try {
      const res = await fetch(`/api/students/${studentId}/contact`)
      if (res.ok) {
        const { wa_url } = await res.json()
        window.open(wa_url, '_blank')
      }
    } finally {
      setContactLoading(false)
    }
  }

  function getCurrentTrimester(): number {
    const month = new Date().getMonth() + 1
    if (month >= 8 && month <= 11) return 1
    if (month >= 12 || month <= 3) return 2
    return 3
  }

  // Loading state
  if (loadingState.status === 'loading') {
    return (
      <div className="p-8">
        <div className="h-10 w-32 rounded-lg bg-muted animate-pulse mb-6" />
        <Card className="p-8 mb-6">
          <div className="space-y-4">
            <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-48 rounded-lg bg-muted animate-pulse" />
          </div>
        </Card>
        <Card className="p-8">
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </Card>
      </div>
    )
  }

  // Error state
  if (loadingState.status === 'error' || !student) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => router.push('/alumnos')} className="mb-6 gap-2">
          <ArrowLeft size={18} />
          Volver a Alumnos
        </Button>
        <div className="max-w-2xl mx-auto">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">No se pudo cargar</h3>
              <p className="text-sm text-destructive/80 mb-4">{loadingState.error}</p>
              <Button
                size="sm"
                onClick={() => loadData()}
                className="bg-destructive hover:bg-destructive/90"
              >
                Intentar de nuevo
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div className="p-8">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push('/alumnos')} className="mb-6 gap-2">
        <ArrowLeft size={18} />
        Volver a Alumnos
      </Button>

      {/* Student header */}
      <Card className="p-8 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-text-primary">{student.name}</h1>
              {student.has_nee && (
                <span
                  className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200"
                  title="Estudiante con Necesidades Educativas Especiales"
                >
                  NEE
                </span>
              )}
            </div>
            <div className="text-text-secondary space-y-1">
              <p>
                {student.group_name} - {student.group_grade}
              </p>
              {student.richmond_student_id && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm">Sincronizado con Richmond</span>
                </div>
              )}
              {student.observation_day && (
                <p className="text-sm">Día de observación: {student.observation_day}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {student.has_contact && (
              <Button
                variant="outline"
                onClick={handleWhatsApp}
                disabled={contactLoading}
                className="gap-2"
              >
                <MessageCircle size={18} />
                {contactLoading ? 'Abriendo...' : 'WhatsApp'}
              </Button>
            )}
            <Button onClick={downloadReport} disabled={downloadingReport} className="gap-2">
              <Download size={18} />
              {downloadingReport ? 'Generando...' : 'Descargar Reporte'}
            </Button>
          </div>
        </div>
      </Card>

      {!progressData || progressData.assignments.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-text-secondary space-y-4">
            <Users size={48} className="mx-auto opacity-40" />
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Sin datos de progreso aún
              </h3>
              <p className="text-sm">
                Los datos de Richmond aparecerán aquí una vez que sincronices las calificaciones
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Progress chart */}
          <Card className="p-8">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Progreso en el tiempo</h2>
            <StudentProgressChart assignments={progressData.assignments} />
          </Card>

          {/* Assignment history table */}
          <Card className="p-8">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Historial de trabajos</h2>
            <StudentScoreTable assignments={progressData.assignments} studentName={student.name} />
          </Card>

          {/* Fortnight summary */}
          {progressData.fortnights.length > 0 && (
            <Card className="p-8">
              <h2 className="text-xl font-semibold text-text-primary mb-6">
                Quincenas participadas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {progressData.fortnights.map((fortnight) => (
                  <div
                    key={fortnight.number}
                    className="p-4 border border-border rounded-lg hover:border-primary/30 transition-colors"
                  >
                    <h4 className="font-semibold text-text-primary mb-1">
                      Quincena {fortnight.number}
                    </h4>
                    <p className="text-sm text-text-secondary mb-2">{fortnight.project_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(fortnight.start_date).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      -{' '}
                      {new Date(fortnight.end_date).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Observation summary */}
          {progressData.observations.length > 0 && (
            <Card className="p-8">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Observaciones registradas
              </h2>
              <p className="text-text-secondary">
                {progressData.observations.length}{' '}
                {progressData.observations.length === 1 ? 'observación' : 'observaciones'}{' '}
                cualitativas
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
