'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { GroupList } from '@/components/settings/GroupList'
import { GroupEditor } from '@/components/settings/GroupEditor'
import { StudentRoster } from '@/components/settings/StudentRoster'
import { ApiKeyManager } from '@/components/settings/ApiKeyManager'
import { X, ExternalLink, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react'
import { RichmondExtensionGuide } from '@/components/app/RichmondExtensionGuide'
import { getEditorialConfig } from '@/lib/editorial/registry'
import { activeGroups, archivedGroups } from '@/lib/groups/archive'
import { toast } from 'sonner'

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
  const [oldGroups, setOldGroups] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apiKeys, setApiKeys] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [students, setStudents] = useState<any[]>([])

  // Name, period, and personalization now live in Mi Perfil (single hub). This page keeps
  // account/session, templates, groups, Richmond, and the danger zone.
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasRichmondCredentials, setHasRichmondCredentials] = useState(false)
  const [revokingCredentials, setRevokingCredentials] = useState(false)

  const [groupMode, setGroupMode] = useState<ViewMode>('list')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [generatedKey, setGeneratedKey] = useState<{ key: string; key_prefix: string } | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Multi-template manager
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [multiTemplates, setMultiTemplates] = useState<any[]>([])
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [newTemplateLabel, setNewTemplateLabel] = useState('')
  const [newTemplatePlanType, setNewTemplatePlanType] = useState<'quincena' | 'taller'>('quincena')
  // Honest upload status shown INLINE in the upload box (spinner → success → failure).
  const [uploadStatus, setUploadStatus] = useState<
    | { phase: 'idle' }
    | { phase: 'uploading'; msg: string }
    | { phase: 'success'; msg: string }
    | { phase: 'error'; msg: string }
  >({ phase: 'idle' })
  const uploadMsgTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)
  const multiTemplateFileRef = useRef<HTMLInputElement>(null)

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

        // Load groups with student counts. select('*') so archived_at reads as undefined
        // (= active) before migration 067 lands.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: groupsData } = await (supabase as any)
          .from('groups')
          .select('*, students:students(count)')
          .eq('titular_teacher_id', teacherData.id)
          .order('name')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allGroups = (groupsData ?? []).map((g: any) => ({
          ...g,
          student_count: g.students?.[0]?.count || 0,
        }))
        setGroups(activeGroups(allGroups))
        setOldGroups(archivedGroups(allGroups))

        // Load API keys — exclude revoked ones (soft-deleted)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: keysData } = await (supabase as any)
          .from('api_keys')
          .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
          .eq('teacher_id', teacherData.id)
          .is('revoked_at', null)
          .order('created_at', { ascending: false })
        setApiKeys(keysData || [])

        // Load multi-templates (own + shared with the school)
        fetch('/api/teachers/templates')
          .then((r) => r.json())
          .then((d) => {
            setMultiTemplates(d.templates ?? [])
            setIsAdmin(!!d.is_admin)
          })
          .catch(() => {})
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  async function handleMultiTemplateFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !newTemplateLabel.trim()) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const [header, base64] = dataUrl.split(',')
      const mimeType = header.match(/:(.*?);/)?.[1] ?? file.type
      const isImage = file.type.startsWith('image/')

      // Cycle the loading sub-message while the request is genuinely in flight.
      const MESSAGES = [
        'Leyendo tu formato…',
        'Identificando las secciones…',
        'Capturando tu estilo de redacción…',
        'Detectando reglas de formato y PDAs…',
        'Casi listo, esto puede tardar un poco…',
      ]
      let mi = 0
      setUploadStatus({ phase: 'uploading', msg: MESSAGES[0] })
      if (uploadMsgTimer.current) clearInterval(uploadMsgTimer.current)
      uploadMsgTimer.current = setInterval(() => {
        mi = Math.min(mi + 1, MESSAGES.length - 1)
        setUploadStatus({ phase: 'uploading', msg: MESSAGES[mi] })
      }, 3500)
      const stopCycle = () => {
        if (uploadMsgTimer.current) {
          clearInterval(uploadMsgTimer.current)
          uploadMsgTimer.current = null
        }
      }

      try {
        const body = isImage
          ? {
              label: newTemplateLabel,
              plan_type: newTemplatePlanType,
              imageBase64: base64,
              imageMimeType: mimeType,
            }
          : {
              label: newTemplateLabel,
              plan_type: newTemplatePlanType,
              documentBase64: base64,
              documentMimeType: mimeType,
            }
        // Hard client timeout so the spinner can never spin forever if the response is lost.
        const ac = new AbortController()
        const timer = setTimeout(() => ac.abort(), 125_000)
        const res = await fetch('/api/teachers/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ac.signal,
        })
        clearTimeout(timer)
        if (!res.ok) throw new Error((await res.json()).error)
        const { template_record: template } = await res.json()
        setMultiTemplates((prev) => [
          { ...template, is_owner: true, shared_with_school: false, is_school_official: false },
          ...prev,
        ])
        setNewTemplateLabel('')
        stopCycle()
        setUploadStatus({
          phase: 'success',
          msg: '¡Formato guardado! Generaré tus planeaciones siguiendo este estilo.',
        })
        setTimeout(() => {
          setShowAddTemplate(false)
          setUploadStatus({ phase: 'idle' })
        }, 2500)
      } catch (err) {
        stopCycle()
        // On timeout/lost response the extraction may still have saved — refetch to recover it.
        if (err instanceof DOMException && err.name === 'AbortError') {
          try {
            const d = await fetch('/api/teachers/templates').then((r) => r.json())
            if (Array.isArray(d.templates)) setMultiTemplates(d.templates)
          } catch {
            /* ignore */
          }
          setUploadStatus({
            phase: 'error',
            msg: 'Tardó más de lo normal. Revisa la lista — puede que ya se haya guardado.',
          })
        } else {
          setUploadStatus({
            phase: 'error',
            msg: err instanceof Error ? err.message : 'No pude analizar el archivo.',
          })
        }
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleDeleteTemplate(id: string) {
    setDeletingTemplateId(id)
    try {
      await fetch(`/api/teachers/templates?id=${id}`, { method: 'DELETE' })
      setMultiTemplates((prev) => prev.filter((t) => t.id !== id))
    } finally {
      setDeletingTemplateId(null)
    }
  }

  async function patchTemplate(
    id: string,
    patch: { shared_with_school?: boolean; is_school_official?: boolean }
  ) {
    const res = await fetch('/api/teachers/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error || 'No se pudo actualizar')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMultiTemplates((prev: any[]) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    if (patch.shared_with_school !== undefined)
      toast.success(patch.shared_with_school ? 'Compartido con tu escuela' : 'Dejó de compartirse')
    if (patch.is_school_official !== undefined)
      toast.success(patch.is_school_official ? 'Marcado como formato oficial' : 'Ya no es oficial')
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
      fixed_weekly_schedule: {
        letter_number_day: data.letter_number_day ?? 'martes',
        numeros_day: data.numeros_day ?? 'jueves',
      },
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
        fixed_weekly_schedule: {
          letter_number_day: data.letter_number_day ?? 'martes',
          numeros_day: data.numeros_day ?? 'jueves',
        },
      })
      .eq('id', selectedGroupId)

    setLoading(false)
    setGroupMode('list')
    setSelectedGroupId(null)
    await loadData()
  }

  // End of school year: archive ALL current groups (students + planeaciones preserved),
  // then open the creator for the new cohort's group.
  async function handleNewCycle() {
    if (
      !confirm(
        `¿Comenzar un nuevo ciclo escolar?\n\nTus ${groups.length} grupo(s) actuales se archivarán: los alumnos y sus datos se conservan, pero dejarán de aparecer en la app. Podrás restaurarlos desde "Grupos archivados".`
      )
    )
      return

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('groups')
      .update({ archived_at: new Date().toISOString() })
      .eq('titular_teacher_id', teacher.id)
      .is('archived_at', null)
    if (error) {
      console.error('archive groups failed:', error)
      toast.error('No se pudieron archivar los grupos. Intenta de nuevo.')
      return
    }
    toast.success('Grupos archivados. Crea el grupo del nuevo ciclo.')
    await loadData()
    setGroupMode('create')
  }

  async function handleRestoreGroup(groupId: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('groups')
      .update({ archived_at: null })
      .eq('id', groupId)
    if (error) {
      toast.error('No se pudo restaurar el grupo.')
      return
    }
    toast.success('Grupo restaurado.')
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

    // Names are encrypted at rest — fetch decrypted via the server route.
    const res = await fetch(`/api/students?group_id=${groupId}`)
    const { students: data } = res.ok ? await res.json() : { students: [] }
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
          letter_number_day: selectedGroup.fixed_weekly_schedule?.letter_number_day ?? 'martes',
          numeros_day: selectedGroup.fixed_weekly_schedule?.numeros_day ?? 'jueves',
        }
      : undefined

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Configuración</h1>

      {/* Account / session */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Cuenta</h2>
            <p className="text-sm text-text-secondary truncate">{email}</p>
            <p className="text-xs text-text-muted mt-1">
              Tu nombre, personalización y diseño de planeaciones están en{' '}
              <Link href="/perfil" className="text-brand hover:underline">
                Mi Perfil
              </Link>
              .
            </p>
          </div>
          <SignOutButton variant="button" className="shrink-0" />
        </div>
      </Card>

      {/* Plan Template Section */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-text-primary">Formatos de planeación</h2>
          {!showAddTemplate && multiTemplates.length < 5 && (
            <Button variant="outline" size="sm" onClick={() => setShowAddTemplate(true)}>
              + Agregar formato
            </Button>
          )}
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Sube el formato de tu escuela (.docx recomendado) y el AI lo seguirá exactamente
        </p>

        {/* Template list */}
        {multiTemplates.length > 0 && (
          <div className="space-y-2 mb-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {/* ponytail: filter(Boolean) guards against a malformed upload response */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {multiTemplates.filter(Boolean).map((t: any) => {
              const isOwner = t.is_owner !== false // older responses lack the flag → treat as own
              return (
                <div
                  key={t.id}
                  className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border ${
                    isOwner ? 'bg-success-light border-success' : 'bg-brand-subtle border-brand'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p
                        className={`text-sm font-medium ${isOwner ? 'text-success-text' : 'text-brand'}`}
                      >
                        {t.label}
                      </p>
                      {t.is_school_official && (
                        <span className="rounded-full bg-warning-light px-2 py-0.5 text-[0.65rem] font-semibold text-warning-text">
                          Formato de la escuela
                        </span>
                      )}
                      {isOwner && t.shared_with_school && !t.is_school_official && (
                        <span className="rounded-full bg-success-light px-2 py-0.5 text-[0.65rem] font-semibold text-success-text">
                          Compartido
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isOwner ? 'text-success-text' : 'text-brand'}`}>
                      {t.plan_type === 'taller' ? 'Taller' : 'Quincena'}
                      {!isOwner && t.owner_name ? ` · de ${t.owner_name}` : ''}
                    </p>
                  </div>

                  {isOwner ? (
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-success-text">
                        <input
                          type="checkbox"
                          checked={!!t.shared_with_school}
                          onChange={(e) =>
                            patchTemplate(t.id, { shared_with_school: e.target.checked })
                          }
                          className="h-3.5 w-3.5"
                        />
                        Compartir con escuela
                      </label>
                      {isAdmin && t.shared_with_school && (
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-warning-text">
                          <input
                            type="checkbox"
                            checked={!!t.is_school_official}
                            onChange={(e) =>
                              patchTemplate(t.id, { is_school_official: e.target.checked })
                            }
                            className="h-3.5 w-3.5"
                          />
                          Oficial
                        </label>
                      )}
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        disabled={deletingTemplateId === t.id}
                        className="text-xs text-success-text hover:text-error cursor-pointer disabled:opacity-50"
                      >
                        {deletingTemplateId === t.id ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-brand">Solo lectura</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add template form */}
        {showAddTemplate && (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Nombre del formato
                </label>
                <Input
                  value={newTemplateLabel}
                  onChange={(e) => setNewTemplateLabel(e.target.value)}
                  placeholder="Ej: Formato Escuela Americana"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Tipo</label>
                <select
                  value={newTemplatePlanType}
                  onChange={(e) => setNewTemplatePlanType(e.target.value as 'quincena' | 'taller')}
                  className="w-full h-9 px-2 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="quincena">Quincena</option>
                  <option value="taller">Taller</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-[40px] text-sm"
                disabled={!newTemplateLabel.trim() || uploadStatus.phase === 'uploading'}
                onClick={() => multiTemplateFileRef.current?.click()}
              >
                {uploadStatus.phase === 'uploading'
                  ? 'Analizando...'
                  : 'Subir archivo (.docx, PDF o foto)'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploadStatus.phase === 'uploading'}
                onClick={() => {
                  setShowAddTemplate(false)
                  setUploadStatus({ phase: 'idle' })
                }}
              >
                Cancelar
              </Button>
            </div>
            <input
              ref={multiTemplateFileRef}
              type="file"
              accept=".doc,.docx,image/jpeg,image/png,image/webp,.pdf"
              className="hidden"
              onChange={handleMultiTemplateFile}
            />

            {/* Inline status — honest states, in the same box, with color contrast */}
            {uploadStatus.phase === 'idle' ? (
              <p className="text-xs text-text-secondary">
                Se recomienda .docx — es el formato más fácil de leer para la IA.
              </p>
            ) : (
              <div
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  uploadStatus.phase === 'uploading'
                    ? 'border-brand bg-brand-subtle text-brand'
                    : uploadStatus.phase === 'success'
                      ? 'border-success bg-success-light text-success-text'
                      : 'border-error bg-error-light text-error-text'
                }`}
              >
                {uploadStatus.phase === 'uploading' ? (
                  <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
                ) : uploadStatus.phase === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {uploadStatus.phase === 'uploading'
                      ? 'Analizando tu formato…'
                      : uploadStatus.phase === 'success'
                        ? '¡Listo!'
                        : 'No se pudo'}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed">{uploadStatus.msg}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {multiTemplates.length === 0 && !showAddTemplate && (
          <p className="text-sm text-text-secondary">
            Sin formatos guardados. Agrega el formato de tu escuela para que el AI lo siga.
          </p>
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
            <div className="flex gap-2">
              {groups.length > 0 && (
                <Button onClick={handleNewCycle} variant="outline" className="min-h-[40px]">
                  Nuevo ciclo escolar
                </Button>
              )}
              <Button
                onClick={() => setGroupMode('create')}
                className="min-h-[40px] bg-primary hover:bg-primary-dark"
              >
                Crear grupo
              </Button>
            </div>
          )}
        </div>

        {groupMode === 'list' && (
          <>
            <GroupList
              groups={groups}
              onEdit={(id) => {
                setSelectedGroupId(id)
                setGroupMode('edit')
              }}
              onViewStudents={handleViewStudents}
              onDelete={handleDeleteGroup}
            />
            {oldGroups.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                  Grupos archivados ({oldGroups.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {oldGroups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-inset p-3"
                    >
                      <div className="text-sm">
                        <span className="font-medium text-text-primary">{g.name}</span>
                        <span className="text-text-secondary">
                          {' '}
                          · {g.grade} · {g.academic_year} · {g.student_count} estudiantes
                        </span>
                      </div>
                      <Button
                        onClick={() => handleRestoreGroup(g.id)}
                        variant="outline"
                        size="sm"
                        className="min-h-[36px]"
                      >
                        Restaurar
                      </Button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
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
          <div className="mb-6 p-4 rounded-lg border border-warning bg-warning-light">
            <p className="text-xs font-semibold text-warning-text mb-1">
              Aviso importante sobre el uso de datos de Richmond LP
            </p>
            <p className="text-xs text-warning-text">
              MaestraIA no es proveedor afiliado ni autorizado de Richmond Publishing / Programas de
              Innovación Educativa (Grupo Santillana). Al activar la sincronización confirmas que:{' '}
              <strong>(a)</strong> tienes autorización de tu institución para el intercambio de
              datos entre plataformas educativas, y <strong>(b)</strong> cumplirás los términos de
              uso de Richmond LP aplicables a tu licencia institucional. El uso de esta función es
              bajo tu responsabilidad y la de tu centro escolar.{' '}
              <a href="/privacidad" className="underline hover:text-warning-text">
                Aviso de Privacidad
              </a>
            </p>
          </div>

          {/* Stored credential status (LFPDPPP transparency) */}
          {hasRichmondCredentials && (
            <div className="mb-6 p-4 rounded-lg border border-info bg-info-light flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-info-text mb-1">
                  Credenciales de Richmond almacenadas
                </p>
                <p className="text-xs text-info-text">
                  Tu correo y contraseña de Richmond LP están almacenados cifrados (AES-256-GCM)
                  para la sincronización automática. Puedes eliminarlos en cualquier momento.
                </p>
              </div>
              <Button
                onClick={handleRevokeRichmondCredentials}
                disabled={revokingCredentials}
                variant="outline"
                className="shrink-0 text-xs border-info text-info-text hover:bg-info-light min-h-[36px]"
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
                <span className="inline-flex items-center gap-1 text-xs text-success-text bg-success-light border border-success px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={11} /> Disponible en Chrome Web Store
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-warning-text bg-warning-light border border-warning px-2 py-0.5 rounded-full">
                  <Clock size={11} /> Próximamente en Chrome Web Store
                </span>
              )}
            </div>

            {/* Install button */}
            <div className="p-4 rounded-lg bg-surface border border-border flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text-primary">MaestraIA Richmond Sync</p>
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
      <Card className="p-6 mt-6 border-error">
        <h2 className="text-lg font-semibold text-error-text mb-1">Zona de peligro</h2>
        <p className="text-sm text-text-secondary mb-4">
          Acciones irreversibles que afectan tu cuenta permanentemente.
        </p>
        <div className="flex items-center justify-between p-4 rounded-lg border border-error bg-error-light">
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
          <div className="bg-card rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-2">¿Eliminar tu cuenta?</h3>
            <p className="text-sm text-text-secondary mb-4">
              Todos tus datos (planeaciones, alumnos, materiales, credenciales) serán eliminados
              permanentemente en 30 días. Esta acción no se puede deshacer.
            </p>
            <p className="text-sm font-medium text-text-primary mb-2">
              Escribe <span className="font-mono bg-inset px-1 rounded">ELIMINAR</span> para
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
