'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ChevronDown, Download, Trash2, X } from 'lucide-react'

type Announcement = {
  id: string
  title: string
  content: string
  priority: 'normal' | 'high' | 'urgent'
  published_at: string
  expires_at: string | null
  author_teacher_id: string
  teachers: { full_name: string; role_type: string } | null
}

type Resource = {
  id: string
  title: string
  description: string | null
  file_url: string
  resource_type: string
  grade_level: string | null
  tags: string[] | null
  created_at: string
  teacher_id: string
  teachers: { full_name: string } | null
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-l-4 border-red-500',
  high: 'border-l-4 border-yellow-400',
  normal: '',
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Importante',
  normal: 'Normal',
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  worksheet: 'Hoja de trabajo',
  game: 'Juego',
  flashcard: 'Tarjetas',
  guide: 'Planeación / guía',
  template: 'Plantilla',
  other: 'Otro',
}

const RESOURCE_FILTERS = ['todos', 'worksheet', 'game', 'flashcard', 'guide', 'template', 'other']

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function RedPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  // Planeación formats shared across the school (own-shared + others'-shared).
  const [sharedFormats, setSharedFormats] = useState<
    {
      id: string
      label: string
      plan_type: string
      is_owner: boolean
      is_school_official: boolean
      owner_name: string | null
    }[]
  >([])
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [roleType, setRoleType] = useState<string>('teacher')
  const [loading, setLoading] = useState(true)
  const [schoolName, setSchoolName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [resourceFilter, setResourceFilter] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Create form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formPriority, setFormPriority] = useState<'normal' | 'high' | 'urgent'>('normal')
  const [formExpires, setFormExpires] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    async function load() {
      const [meRes, annRes, resRes, tplRes] = await Promise.all([
        fetch('/api/teachers/me'),
        fetch('/api/school/announcements'),
        fetch('/api/school/resources'),
        fetch('/api/teachers/templates'),
      ])
      const me = await meRes.json()
      const { announcements: ann } = await annRes.json()
      const { resources: res } = await resRes.json()
      const { templates: tpls } = await tplRes.json().catch(() => ({ templates: [] }))
      setTeacherId(me.id)
      setRoleType(me.role_type || 'teacher')
      setSchoolName(me.schools?.name ?? '')
      setAnnouncements(ann || [])
      setResources(res || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSharedFormats((tpls ?? []).filter((t: any) => t.shared_with_school))
      setLoading(false)
      fetch('/api/school/logo')
        .then((r) => (r.ok ? r.json() : { logo_url: null }))
        .then((d) => setLogoUrl(d.logo_url ?? null))
        .catch(() => {})
    }
    load()
  }, [])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      alert('Usa PNG, JPG o WEBP.')
      return
    }
    if (file.size > 1.5 * 1024 * 1024) {
      alert('El logo es muy grande (máx 1.5MB).')
      return
    }
    setUploadingLogo(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const dataUrl = ev.target?.result as string
        const base64 = dataUrl.split(',')[1]
        const res = await fetch('/api/school/logo', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, imageMimeType: file.type }),
        })
        const d = await res.json()
        if (res.ok) setLogoUrl(d.logo_url)
        else alert(d.error ?? 'No pude guardar el logo.')
      } finally {
        setUploadingLogo(false)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleCreateAnnouncement() {
    if (!formTitle.trim() || !formContent.trim()) {
      setFormError('Título y contenido son requeridos')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/school/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          content: formContent.trim(),
          priority: formPriority,
          expires_at: formExpires || undefined,
        }),
      })
      if (res.ok) {
        const { announcement } = await res.json()
        setAnnouncements((prev) => [announcement, ...prev])
        setFormTitle('')
        setFormContent('')
        setFormPriority('normal')
        setFormExpires('')
        setShowForm(false)
      } else {
        setFormError('No se pudo publicar el aviso')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/school/announcements/${id}`, { method: 'DELETE' })
      if (res.ok) setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  async function handleDeleteResource(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/school/resources/${id}`, { method: 'DELETE' })
      if (res.ok) setResources((prev) => prev.filter((r) => r.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const canPost = ['admin', 'coordinator'].includes(roleType)
  const filteredResources =
    resourceFilter === 'todos'
      ? resources
      : resources.filter((r) => r.resource_type === resourceFilter)

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="h-6 bg-muted rounded animate-pulse mb-8 w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 h-32 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="Logo de la escuela"
            className="h-14 w-14 rounded-lg object-contain border border-border bg-white"
          />
        ) : null}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-text-primary">{schoolName || 'Mi escuela'}</h1>
          <label className="text-xs text-primary hover:underline cursor-pointer">
            {uploadingLogo ? 'Subiendo…' : logoUrl ? 'Cambiar logo' : 'Subir logo de la escuela'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoUpload}
              disabled={uploadingLogo}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Avisos (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Avisos</h2>
            {canPost && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm((v) => !v)}
                className="gap-1 text-xs"
              >
                {showForm ? (
                  <>
                    <X size={14} /> Cancelar
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> Nuevo aviso
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Create form */}
          {showForm && canPost && (
            <Card className="p-4 space-y-3 border-primary/30">
              <Input
                placeholder="Título del aviso"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
              <Textarea
                placeholder="Contenido..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={3}
              />
              <div className="flex gap-3 flex-wrap">
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as typeof formPriority)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-text-primary"
                >
                  <option value="normal">Normal</option>
                  <option value="high">Importante</option>
                  <option value="urgent">Urgente</option>
                </select>
                <input
                  type="date"
                  value={formExpires}
                  onChange={(e) =>
                    setFormExpires(e.target.value ? new Date(e.target.value).toISOString() : '')
                  }
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-text-primary"
                  placeholder="Vence (opcional)"
                />
              </div>
              {formError && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle size={12} /> {formError}
                </div>
              )}
              <Button onClick={handleCreateAnnouncement} disabled={submitting} size="sm">
                {submitting ? 'Publicando...' : 'Publicar'}
              </Button>
            </Card>
          )}

          {announcements.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-sm text-text-secondary">Tu escuela aún no tiene avisos.</p>
              {canPost && (
                <p className="text-xs text-text-secondary mt-1">
                  Haz clic en &quot;Nuevo aviso&quot; para publicar uno.
                </p>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <Card key={a.id} className={`p-4 ${PRIORITY_STYLES[a.priority] || ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-text-primary">{a.title}</span>
                        {a.priority !== 'normal' && (
                          <Badge
                            className={
                              a.priority === 'urgent'
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }
                            variant="outline"
                          >
                            {PRIORITY_LABELS[a.priority]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">{a.content}</p>
                      <p className="text-xs text-text-secondary mt-2">
                        {a.teachers?.full_name} · {formatDate(a.published_at)}
                        {a.expires_at && ` · Vence ${formatDate(a.expires_at)}`}
                      </p>
                    </div>
                    {(a.author_teacher_id === teacherId || roleType === 'admin') && (
                      <button
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        disabled={deleting === a.id}
                        className="text-text-secondary hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recursos (1/3 width) */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-text-primary">Recursos compartidos</h2>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {RESOURCE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setResourceFilter(f)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  resourceFilter === f
                    ? 'bg-primary text-white'
                    : 'bg-muted text-text-secondary hover:bg-primary-light'
                }`}
              >
                {f === 'todos' ? 'Todos' : RESOURCE_TYPE_LABELS[f]}
              </button>
            ))}
          </div>

          {filteredResources.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-xs text-text-secondary">
                {resourceFilter === 'todos'
                  ? 'Aún no hay recursos compartidos en tu escuela.'
                  : 'Sin recursos de este tipo.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredResources.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
                      {r.description && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                          {r.description}
                        </p>
                      )}
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {RESOURCE_TYPE_LABELS[r.resource_type] || r.resource_type}
                        </Badge>
                        {r.grade_level && (
                          <Badge variant="outline" className="text-xs">
                            {r.grade_level}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        {r.teachers?.full_name} · {formatDate(r.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:opacity-70 transition-opacity"
                        title="Ver / descargar"
                      >
                        <Download size={14} />
                      </a>
                      {(r.teacher_id === teacherId || roleType === 'admin') && (
                        <button
                          onClick={() => handleDeleteResource(r.id)}
                          disabled={deleting === r.id}
                          className="text-text-secondary hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Shared planeación formats — what teachers across the school have made available */}
          <h2 className="text-base font-semibold text-text-primary pt-2">
            Formatos de planeación compartidos
          </h2>
          {sharedFormats.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-xs text-text-secondary">
                Aún no hay formatos compartidos. Comparte uno desde Configuración → Formatos.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {sharedFormats.map((f) => (
                <Card key={f.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium text-text-primary truncate">{f.label}</p>
                        {f.is_school_official && (
                          <Badge variant="outline" className="text-xs">
                            Oficial
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        {f.plan_type === 'taller' ? 'Taller' : 'Quincena'}
                        {f.is_owner
                          ? ' · tú lo compartiste'
                          : f.owner_name
                            ? ` · de ${f.owner_name}`
                            : ''}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
