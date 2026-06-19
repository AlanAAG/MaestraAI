'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { SchoolSelector } from '@/components/onboarding/SchoolSelector'
import { SchoolCreator } from '@/components/onboarding/SchoolCreator'
import { GroupCreator } from '@/components/onboarding/GroupCreator'
import { Check } from 'lucide-react'
import { EDITORIAL_OPTIONS } from '@/lib/editorial/registry'

const STEPS = [
  { question: '¿Cómo te llamas?', field: 'full_name', placeholder: 'Ej: María García' },
  { question: '¿Qué editorial usas?', field: 'editorial', placeholder: 'Ej: Richmond' },
  { question: '¿En qué escuela trabajas?', field: 'school', placeholder: '' },
  { question: 'Crea tu primer grupo', field: 'group', placeholder: '' },
  { question: '¡Todo listo!', field: 'confirmation', placeholder: '' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({
    full_name: '',
    editorial: '',
  })
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [showSchoolCreator, setShowSchoolCreator] = useState(false)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [groupsCreated, setGroupsCreated] = useState(0)
  const [showGroupChoice, setShowGroupChoice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  async function handleNext() {
    if (step === 2 && !schoolId && !showSchoolCreator) {
      // School selection step - need to select or create
      setError('Por favor selecciona una escuela o crea una nueva')
      return
    }

    if (step === 3 && !groupId) {
      // Group creation step - need to create group
      setError('Por favor crea un grupo para continuar')
      return
    }

    if (isLast) {
      // Final step - complete onboarding
      await completeOnboarding()
    } else {
      setError('')

      // After step 1 (editorial), create teacher record before moving to step 2 (school)
      if (step === 1) {
        const teacherCreated = await ensureTeacherRecordExists()
        if (!teacherCreated) {
          return // Error already set by ensureTeacherRecordExists
        }
      }

      setStep(step + 1)
    }
  }

  async function ensureTeacherRecordExists() {
    const supabase = createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      setError('No se pudo verificar tu sesión')
      return false
    }

    // Check if teacher record already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingTeacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (existingTeacher) {
      return true // Already exists
    }

    // Create teacher record with Step 1-2 data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: teacherError } = await (supabase as any).from('teachers').insert({
      auth_id: user.id,
      email: user.email!,
      full_name: answers.full_name,
      editorial: answers.editorial,
      school_id: null, // Will be updated after school creation
      role: 'titular',
    })

    if (teacherError) {
      console.error('Failed to create teacher record:', teacherError)
      setError('Error al crear tu perfil de maestra')
      return false
    }

    // Record the consents the teacher gave on the registration page
    try {
      const raw = localStorage.getItem('pendingConsents')
      if (raw) {
        const pending = JSON.parse(raw)
        localStorage.removeItem('pendingConsents') // remove before fetch — prevents duplicate on retry
        await fetch('/api/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pending),
        })
      }
    } catch {
      // Non-blocking — consent recording failure should not block onboarding
      console.warn('Failed to record registration consents')
    }

    return true
  }

  async function handleSchoolCreated(data: { name: string; state: string }) {
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Use secure RPC function instead of direct INSERT
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: schoolId, error: schoolError } = await (supabase as any).rpc(
        'create_school_for_onboarding',
        {
          school_name: data.name,
          school_state: data.state || 'Ciudad de México',
        }
      )

      if (schoolError) throw schoolError

      setSchoolId(schoolId as string)
      setShowSchoolCreator(false)
      setError('')
    } catch (err) {
      console.error('Failed to create school:', err)
      setError('Error al crear la escuela')
    } finally {
      setLoading(false)
    }
  }

  async function handleGroupCreated(data: {
    name: string
    grade: string
    academic_year: string
    richmond_class_code?: string
    consentStudentData: boolean
  }) {
    if (!schoolId) {
      setError('Debes seleccionar una escuela primero')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Teacher record already exists from Step 3, just fetch and update school_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher, error: teacherError } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (teacherError || !teacher) {
        throw new Error('No se encontró tu perfil de maestra')
      }

      // Update teacher's school_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('teachers').update({ school_id: schoolId }).eq('id', teacher.id)

      // Create group
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: group, error: groupError } = await (supabase as any)
        .from('groups')
        .insert({
          school_id: schoolId,
          titular_teacher_id: teacher.id,
          name: data.name,
          grade: data.grade,
          academic_year: data.academic_year,
          richmond_class_code: data.richmond_class_code || null,
        })
        .select()
        .single()

      if (groupError) throw groupError

      setGroupId(group.id)
      setGroupsCreated((n) => n + 1)
      setShowGroupChoice(true)
      setError('')

      // Record student data transfer consent (first group creation triggers this)
      if (groupsCreated === 0) {
        try {
          await fetch('/api/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consentStudentData: data.consentStudentData }),
          })
        } catch {
          // Non-blocking
        }
      }
    } catch (err) {
      console.error('Failed to create group:', err)
      setError('Error al crear el grupo')
    } finally {
      setLoading(false)
    }
  }

  async function completeOnboarding() {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="flex gap-2 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-text-secondary">
            Paso {step + 1} de {STEPS.length}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-2xl font-semibold text-text-primary mb-6">
              {currentStep.question}
            </h1>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Step 0: Name (free text) */}
            {step === 0 && (
              <>
                <Input
                  value={answers.full_name}
                  onChange={(e) => setAnswers({ ...answers, full_name: e.target.value })}
                  placeholder={currentStep.placeholder}
                  className="mb-6 min-h-[44px]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNext()
                  }}
                />
                <Button
                  onClick={handleNext}
                  disabled={!answers.full_name}
                  className="w-full min-h-[44px] bg-primary hover:bg-primary-dark"
                >
                  Siguiente
                </Button>
              </>
            )}

            {/* Step 1: Editorial (select from registry) */}
            {step === 1 && (
              <>
                <select
                  value={answers.editorial}
                  onChange={(e) => setAnswers({ ...answers, editorial: e.target.value })}
                  className="w-full mb-6 h-11 px-3 rounded-lg border border-input bg-background text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                >
                  <option value="">Selecciona tu editorial...</option>
                  {EDITORIAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleNext}
                  disabled={!answers.editorial}
                  className="w-full min-h-[44px] bg-primary hover:bg-primary-dark"
                >
                  Siguiente
                </Button>
              </>
            )}

            {/* Step 3: School selection or creation */}
            {step === 2 && (
              <>
                {!showSchoolCreator ? (
                  <>
                    <SchoolSelector
                      value={schoolId}
                      onChange={setSchoolId}
                      onCreateNew={() => setShowSchoolCreator(true)}
                    />
                    <Button
                      onClick={handleNext}
                      disabled={!schoolId}
                      className="w-full min-h-[44px] bg-primary hover:bg-primary-dark mt-6"
                    >
                      Siguiente
                    </Button>
                  </>
                ) : (
                  <SchoolCreator
                    onSubmit={handleSchoolCreated}
                    onCancel={() => setShowSchoolCreator(false)}
                    loading={loading}
                  />
                )}
              </>
            )}

            {/* Step 4: Group creation */}
            {step === 3 && (
              <>
                {showGroupChoice ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
                      <Check size={16} className="shrink-0" />
                      {groupsCreated === 1 ? '1 grupo creado' : `${groupsCreated} grupos creados`}
                    </div>
                    <Button
                      onClick={() => setShowGroupChoice(false)}
                      variant="outline"
                      className="w-full min-h-[44px]"
                    >
                      Agregar otro grupo
                    </Button>
                    <Button
                      onClick={() => setStep(step + 1)}
                      className="w-full min-h-[44px] bg-primary hover:bg-primary-dark"
                    >
                      Continuar →
                    </Button>
                  </div>
                ) : (
                  <GroupCreator
                    key={groupsCreated}
                    onSubmit={handleGroupCreated}
                    loading={loading}
                  />
                )}
              </>
            )}

            {/* Step 5: Confirmation */}
            {step === 4 && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="text-green-600" size={32} />
                </div>
                <p className="text-text-secondary mb-2">
                  ¡Perfecto! Tu cuenta está configurada. Ya puedes empezar a crear planeaciones.
                </p>
                <p className="text-sm text-text-secondary mb-6">
                  Para sincronizar calificaciones de Richmond, ve a{' '}
                  <strong>Configuración → Sincronización Richmond</strong> cuando estés lista.
                </p>
                <Button
                  onClick={completeOnboarding}
                  className="w-full min-h-[44px] bg-primary hover:bg-primary-dark"
                >
                  Ir al Dashboard
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
