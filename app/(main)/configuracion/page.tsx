'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { GroupList } from '@/components/settings/GroupList'
import { GroupEditor } from '@/components/settings/GroupEditor'
import { StudentRoster } from '@/components/settings/StudentRoster'
import { ApiKeyManager } from '@/components/settings/ApiKeyManager'
import { X, ExternalLink, CheckCircle2, Clock } from 'lucide-react'
import { RichmondExtensionGuide } from '@/components/app/RichmondExtensionGuide'
import { getEditorialConfig } from '@/lib/editorial/registry'

// Replace with the real Chrome Web Store URL after the extension is approved.
// Format: https://chromewebstore.google.com/detail/maestraai-richmond-sync/[extension-id]
const CHROME_STORE_URL = ''

type ViewMode = 'list' | 'create' | 'edit' | 'students'

export default function ConfiguracionPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teacher, setTeacher] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [school, setSchool] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [groups, setGroups] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apiKeys, setApiKeys] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [students, setStudents] = useState<any[]>([])

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [periodMinutes, setPeriodMinutes] = useState(45)
  const [templateText, setTemplateText] = useState('')
  const [templateStatus, setTemplateStatus] = useState<'idle' | 'analyzing' | 'saved'>('idle')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [planTemplate, setPlanTemplate] = useState<{ sections?: string[]; notes?: string } | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasRichmondCredentials, setHasRichmondCredentials] = useState(false)
  const [revokingCredentials, setRevokingCredentials] = useState(false)

  const [groupMode, setGroupMode] = useState<ViewMode>('list')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [generatedKey, setGeneratedKey] = useState<{ key: string; key_prefix: string } | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Set email from auth user
      setEmail(user.email || '')

      // Load teacher
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacherData } = await (supabase as any)
        .from('teachers')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      if (teacherData) {
        setTeacher(teacherData)
        setFullName(teacherData.full_name || user.email?.split('@')[0] || '')
        setPeriodMinutes(teacherData.english_period_minutes ?? 45)
        setPlanTemplate(teacherData.plan_template ?? null)
        setHasRichmondCredentials(
          !!(teacherData.richmond_email_encrypted || teacherData.richmond_password_encrypted)
        )

        // Load school
        if (teacherData.school_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: schoolData } = await (supabase as any)
            .from('schools')
            .select('*')
            .eq('id', teacherData.school_id)
            .single()
          setSchool(schoolData)
        }

        // Load groups with student counts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: groupsData } = await (supabase as any)
          .from('groups')
          .select(
            `
            id,
            name,
            grade,
            academic_year,
            richmond_class_code,
            students:students(count)
          `
          )
          .eq('titular_teacher_id', teacherData.id)
          .order('name')

        setGroups(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          groupsData?.map((g: any) => ({
            ...g,
            student_count: g.students?.[0]?.count || 0,
          })) || []
        )

        // Load API keys — exclude revoked ones (soft-deleted)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: keysData } = await (supabase as any)
          .from('api_keys')
          .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
          .eq('teacher_id', teacherData.id)
          .is('revoked_at', null)
          .order('created_at', { ascending: false })
        setApiKeys(keysData || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  async function handleSaveProfile() {
    setLoading(true)
    setSaved(false)

    const supabase = createClient()
    if (teacher) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('teachers')
        .update({ full_name: fullName, english_period_minutes: periodMinutes })
        .eq('id', teacher.id)
    }

    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    await loadData()
  }

  async function handleAnalyzeTemplate() {
    if (templateText.trim().length < 50) return alert('Pega al menos 50 caracteres del formato')
    setTemplateStatus('analyzing')
    try {
      const res = await fetch('/api/teachers/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_text: templateText }),
      })
      if (!res.ok) throw new Error()
      const { plan_template } = await res.json()
      setPlanTemplate(plan_template)
      setTemplateText('')
      setTemplateStatus('saved')
      setTimeout(() => setTemplateStatus('idle'), 3000)
    } catch {
      alert('No pude analizar el formato. Intenta con más texto.')
      setTemplateStatus('idle')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleCreateGroup(data: any) {
    setLoading(true)
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('groups').insert({
      school_id: teacher.school_id,
      titular_teacher_id: teacher.id,
      name: data.name,
      grade: data.grade,
      academic_year: data.academic_year,
      richmond_class_code: data.richmond_class_code || null,
    })

    setLoading(false)
    setGroupMode('list')
    await loadData()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleEditGroup(data: any) {
    if (!selectedGroupId) return

    setLoading(true)
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('groups')
      .update({
        name: data.name,
        grade: data.grade,
        academic_year: data.academic_year,
        richmond_class_code: data.richmond_class_code || null,
      })
      .eq('id', selectedGroupId)

    setLoading(false)
    setGroupMode('list')
    setSelectedGroupId(null)
    await loadData()
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm('¿Estás segura de eliminar este grupo? Esta acción no se puede deshacer.')) return

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('groups').delete().eq('id', groupId)
    await loadData()
  }

  async function handleViewStudents(groupId: string) {
    setSelectedGroupId(groupId)
    setGroupMode('students')

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('students')
      .select('id, display_name, richmond_student_id')
      .eq('group_id', groupId)
      .order('display_name')

    setStudents(data || [])
  }

  async function handleGenerateApiKey(name: string) {
    setLoading(true)
    setGeneratedKey(null)

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) throw new Error('Failed to generate key')

      const data = await response.json()
      setGeneratedKey({ key: data.key, key_prefix: data.key_prefix })
      await loadData()
    } catch (err) {
      console.error('Failed to generate API key:', err)
      alert('Error al generar la clave API')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevokeApiKey(keyId: string) {
    if (!confirm('¿Revocar esta clave API? Las aplicaciones que la usen dejarán de funcionar.'))
      return

    try {
      const response = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: keyId }),
      })

      if (!response.ok) throw new Error('Failed to revoke key')

      setApiKeys((prev) => prev.filter((k) => k.id !== keyId))
      setGeneratedKey(null)
    } catch (err) {
      console.error('Failed to revoke API key:', err)
      alert('Error al revocar la clave')
    }
  }

  async function handleRevokeRichmondCredentials() {
    if (
      !confirm(
        '¿Eliminar las credenciales de Richmond almacenadas? La sincronización automática dejará de funcionar hasta que las configures nuevamente.'
      )
    )
      return

    setRevokingCredentials(true)
    try {
      const response = await fetch('/api/richmond/credentials', { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to revoke')
      setHasRichmondCredentials(false)
      await loadData()
    } catch {
      alert('Error al eliminar las credenciales. Intenta de nuevo.')
    } finally {
      setRevokingCredentials(false)
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true)
    try {
      const response = await fetch('/api/account', { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete account')
      router.push('/login?deleted=1')
    } catch {
      alert('Error al eliminar la cuenta. Intenta de nuevo.')
      setDeletingAccount(false)
    }
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)
  const selectedGroupData =
    groupMode === 'edit' && selectedGroup
      ? {
          name: selectedGroup.name,
          grade: selectedGroup.grade,
          academic_year: selectedGroup.academic_year,
          richmond_class_code: selectedGroup.richmond_class_code || '',
        }
      : undefined

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Configuración</h1>

      {/* Profile Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Perfil</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Nombre completo
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre completo"
              className="min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <Input
              value={email}
              disabled
              className="min-h-[44px] bg-surface text-text-secondary cursor-not-allowed"
            />
            <p className="text-xs text-text-secondary mt-1">
              El email no se puede cambiar porque es tu identificador de cuenta
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Duración del período de inglés (minutos)
            </label>
            <input
              type="number"
              min={15}
              max={120}
              step={5}
              value={periodMinutes}
              onChange={(e) => setPeriodMinutes(Number(e.target.value))}
              className="h-10 w-32 rounded-md border border-input bg-background px-3 text-sm"
            />
            <p className="text-xs text-text-secondary mt-1">
              El AI distribuirá las actividades para ocupar exactamente este tiempo
            </p>
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={loading || !fullName}
            className="min-h-[44px] bg-primary hover:bg-primary-dark"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {saved && <p className="text-sm text-green-600">✓ Cambios guardados</p>}
        </div>
      </Card>

      {/* Plan Template Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-1">Formato de planeación</h2>
        <p className="text-sm text-text-secondary mb-4">
          Pega el formato que usa tu escuela y el AI lo adoptará en tus planeaciones
        </p>
        {planTemplate?.sections?.length ? (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-xs font-medium text-green-700 mb-1">✓ Formato guardado</p>
            <p className="text-sm text-green-800">{planTemplate.sections.join(' → ')}</p>
            {planTemplate.notes && (
              <p className="text-xs text-green-600 mt-1">{planTemplate.notes}</p>
            )}
            <button
              onClick={() => setPlanTemplate(null)}
              className="text-xs text-green-600 underline mt-2"
            >
              Reemplazar
            </button>
          </div>
        ) : null}
        {(!planTemplate || !planTemplate.sections?.length) && (
          <div className="space-y-3">
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              placeholder="Pega aquí el formato de planeación de tu escuela (al menos 50 caracteres)..."
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
            <Button
              onClick={handleAnalyzeTemplate}
              disabled={templateStatus === 'analyzing' || templateText.length < 50}
              variant="outline"
              className="min-h-[44px]"
            >
              {templateStatus === 'analyzing' ? 'Analizando...' : 'Analizar formato'}
            </Button>
            {templateStatus === 'saved' && (
              <p className="text-sm text-green-600">✓ Formato guardado</p>
            )}
          </div>
        )}
      </Card>

      {/* School Section */}
      {school && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Escuela</h2>
          <div className="space-y-2">
            <p className="text-text-primary font-medium">{school.name}</p>
            <p className="text-sm text-text-secondary">{school.state}</p>
          </div>
        </Card>
      )}

      {/* Groups Section */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Mis Grupos</h2>
          {groupMode === 'list' && (
            <Button
              onClick={() => setGroupMode('create')}
              className="min-h-[40px] bg-primary hover:bg-primary-dark"
            >
              Crear grupo
            </Button>
          )}
        </div>

        {groupMode === 'list' && (
          <GroupList
            groups={groups}
            onEdit={(id) => {
              setSelectedGroupId(id)
              setGroupMode('edit')
            }}
            onViewStudents={handleViewStudents}
            onDelete={handleDeleteGroup}
          />
        )}

        {groupMode === 'create' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-text-primary">Crear nuevo grupo</h3>
              <button onClick={() => setGroupMode('list')} className="text-text-secondary">
                <X size={20} />
              </button>
            </div>
            <GroupEditor
              onSubmit={handleCreateGroup}
              onCancel={() => setGroupMode('list')}
              loading={loading}
            />
          </div>
        )}

        {groupMode === 'edit' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-text-primary">Editar grupo</h3>
              <button
                onClick={() => {
                  setGroupMode('list')
                  setSelectedGroupId(null)
                }}
                className="text-text-secondary"
              >
                <X size={20} />
              </button>
            </div>
            <GroupEditor
              initialData={selectedGroupData}
              onSubmit={handleEditGroup}
              onCancel={() => {
                setGroupMode('list')
                setSelectedGroupId(null)
              }}
              loading={loading}
            />
          </div>
        )}

        {groupMode === 'students' && selectedGroup && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-text-primary">Estudiantes</h3>
              <button
                onClick={() => {
                  setGroupMode('list')
                  setSelectedGroupId(null)
                }}
                className="text-text-secondary"
              >
                <X size={20} />
              </button>
            </div>
            <StudentRoster students={students} groupName={selectedGroup.name} />
          </div>
        )}
      </Card>

      {/* LMS Sync Section — shown only for editorials that support it */}
      {getEditorialConfig(teacher?.editorial).has_lms_sync && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            Sincronización {getEditorialConfig(teacher?.editorial).label}
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            La extensión de Chrome captura automáticamente las calificaciones de Richmond cuando
            abres el libro de calificaciones en richmondlp.com.
          </p>

          {/* Richmond ToS consent notice */}
          <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              Aviso importante sobre el uso de datos de Richmond LP
            </p>
            <p className="text-xs text-amber-700">
              MaestraAI no es proveedor afiliado ni autorizado de Richmond Publishing / Programas de
              Innovación Educativa (Grupo Santillana). Al activar la sincronización confirmas que:{' '}
              <strong>(a)</strong> tienes autorización de tu institución para el intercambio de
              datos entre plataformas educativas, y <strong>(b)</strong> cumplirás los términos de
              uso de Richmond LP aplicables a tu licencia institucional. El uso de esta función es
              bajo tu responsabilidad y la de tu centro escolar.{' '}
              <a href="/privacidad" className="underline hover:text-amber-900">
                Aviso de Privacidad
              </a>
            </p>
          </div>

          {/* Stored credential status (LFPDPPP transparency) */}
          {hasRichmondCredentials && (
            <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-800 mb-1">
                  Credenciales de Richmond almacenadas
                </p>
                <p className="text-xs text-blue-700">
                  Tu correo y contraseña de Richmond LP están almacenados cifrados (AES-256-GCM)
                  para la sincronización automática. Puedes eliminarlos en cualquier momento.
                </p>
              </div>
              <Button
                onClick={handleRevokeRichmondCredentials}
                disabled={revokingCredentials}
                variant="outline"
                className="shrink-0 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 min-h-[36px]"
              >
                {revokingCredentials ? 'Eliminando...' : 'Eliminar credenciales'}
              </Button>
            </div>
          )}

          {/* Chrome Web Store install guide */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-text-primary">
                Cómo instalar la extensión
              </h3>
              {CHROME_STORE_URL ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={11} /> Disponible en Chrome Web Store
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Clock size={11} /> Próximamente en Chrome Web Store
                </span>
              )}
            </div>

            {/* Install button */}
            <div className="p-4 rounded-lg bg-surface border border-border flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text-primary">MaestraAI Richmond Sync</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {CHROME_STORE_URL
                    ? 'Instala la extensión con un clic. No requiere configuración técnica.'
                    : 'La extensión estará disponible en Chrome Web Store próximamente.'}
                </p>
              </div>
              {CHROME_STORE_URL ? (
                <a
                  href={CHROME_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <ExternalLink size={14} /> Instalar extensión
                </a>
              ) : (
                <span className="shrink-0 inline-flex items-center gap-2 bg-muted text-text-secondary text-sm font-medium px-4 py-2 rounded-lg cursor-not-allowed">
                  <Clock size={14} /> Próximamente
                </span>
              )}
            </div>

            {/* 4-step illustrated guide */}
            <RichmondExtensionGuide />
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Tu clave API</h3>
            <ApiKeyManager
              apiKeys={apiKeys}
              onGenerate={handleGenerateApiKey}
              onRevoke={handleRevokeApiKey}
              generatedKey={generatedKey}
              loading={loading}
            />
          </div>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="p-6 mt-6 border-red-200">
        <h2 className="text-lg font-semibold text-red-700 mb-1">Zona de peligro</h2>
        <p className="text-sm text-text-secondary mb-4">
          Acciones irreversibles que afectan tu cuenta permanentemente.
        </p>
        <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50">
          <div>
            <p className="text-sm font-medium text-text-primary">Eliminar mi cuenta</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Todos tus datos serán eliminados en 30 días. Esta acción no se puede deshacer.
            </p>
          </div>
          <Button
            variant="destructive"
            className="ml-4 shrink-0"
            onClick={() => setShowDeleteModal(true)}
          >
            Eliminar cuenta
          </Button>
        </div>
      </Card>

      {/* Delete account confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-2">¿Eliminar tu cuenta?</h3>
            <p className="text-sm text-text-secondary mb-4">
              Todos tus datos (planeaciones, alumnos, materiales, credenciales) serán eliminados
              permanentemente en 30 días. Esta acción no se puede deshacer.
            </p>
            <p className="text-sm font-medium text-text-primary mb-2">
              Escribe <span className="font-mono bg-gray-100 px-1 rounded">ELIMINAR</span> para
              confirmar:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="mb-4 min-h-[44px]"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                disabled={deletingAccount}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteConfirmText !== 'ELIMINAR' || deletingAccount}
                onClick={handleDeleteAccount}
              >
                {deletingAccount ? 'Eliminando...' : 'Eliminar cuenta'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
