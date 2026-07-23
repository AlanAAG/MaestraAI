'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import { SignOutButton } from '@/components/auth/SignOutButton'
import type { FontKey } from '@/lib/design/fonts'
import { THEME_BRAND } from '@/lib/design/themes'

// App-wide color themes (full environment). 'default' = the app's gold.
const APP_COLOR_OPTIONS: { value: string; label: string; swatch: string }[] = [
  { value: 'default', label: 'Dorado (predeterminado)', swatch: '#b8860b' },
  ...Object.entries(THEME_BRAND).map(([value, t]) => ({
    value,
    label: t.label,
    swatch: t.brand,
  })),
]

type DesignSettings = {
  font: FontKey
  size: number
  accent: string
  lineIntensity: 'light' | 'medium' | 'strong'
  spacing: 'compact' | 'normal' | 'relaxed'
  app_font: 'default' | FontKey
  app_color: string
}
const DEFAULT_DESIGN: DesignSettings = {
  font: 'sans',
  size: 16,
  accent: '#1f2937',
  lineIntensity: 'medium',
  spacing: 'normal',
  app_font: 'default',
  app_color: 'default',
}
const FONT_OPTIONS: { value: DesignSettings['font']; label: string }[] = [
  { value: 'sans', label: 'Sans (moderna)' },
  { value: 'serif', label: 'Serif (clásica)' },
  { value: 'rounded', label: 'Redondeada' },
  { value: 'century', label: 'Century Gothic' },
]
const APP_FONT_OPTIONS: { value: DesignSettings['app_font']; label: string }[] = [
  { value: 'default', label: 'Predeterminada (DM Sans + Inter)' },
  ...FONT_OPTIONS,
]
const SPACING_OPTIONS: { value: DesignSettings['spacing']; label: string }[] = [
  { value: 'compact', label: 'Compacto' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Amplio' },
]
const INTENSITY_OPTIONS: { value: DesignSettings['lineIntensity']; label: string }[] = [
  { value: 'light', label: 'Suaves' },
  { value: 'medium', label: 'Normales' },
  { value: 'strong', label: 'Marcadas' },
]
// Document accent swatches — teacher content (like the vocab color picker), not app chrome.
const ACCENT_SWATCHES = [
  '#1f2937',
  '#b8860b',
  '#2d7d5f',
  '#2e6b8a',
  '#c0392b',
  '#c17817',
  '#5c4e3c',
]

type Teacher = {
  id: string
  full_name: string
  email: string
  role_type: string
  subject: string | null
  editorial: string | null
  school_id: string | null
  group_count: number
  teaching_style?: string | null
  profile_notes?: string | null
  english_period_minutes?: number | null
  design_settings?: DesignSettings | null
  schools: { name: string; city: string; plan: string } | null
}

type SchoolTeacher = {
  id: string
  full_name: string
  email: string
  role_type: string
  subject: string | null
  created_at: string
}

const ROLE_MAP: Record<string, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-brand-subtle text-brand border-brand' },
  coordinator: { label: 'Coordinadora', className: 'bg-info-light text-info-text border-info' },
  teacher: { label: 'Maestra', className: 'bg-inset text-text-secondary border-border' },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_MAP[role] ?? ROLE_MAP.teacher
  return (
    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

export default function PerfilPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Personalization (feeds planeación + material generation)
  const [materia, setMateria] = useState('')
  const [teachingStyle, setTeachingStyle] = useState('')
  const [profileNotes, setProfileNotes] = useState('')
  const [periodMinutes, setPeriodMinutes] = useState(45)
  const [savingP, setSavingP] = useState(false)
  const [savePMsg, setSavePMsg] = useState('')

  // Diseño de mis planeaciones (teachers.design_settings — same global default the doc viewer edits)
  const [design, setDesign] = useState<DesignSettings>(DEFAULT_DESIGN)
  const [savingD, setSavingD] = useState(false)
  const [saveDMsg, setSaveDMsg] = useState('')

  const [schoolTeachers, setSchoolTeachers] = useState<SchoolTeacher[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/teachers/me')
      .then((r) => r.json())
      .then((data) => {
        setTeacher(data)
        setFullName(data.full_name || '')
        setMateria(data.subject || '')
        setTeachingStyle(data.teaching_style || '')
        setProfileNotes(data.profile_notes || '')
        setPeriodMinutes(data.english_period_minutes ?? 45)
        if (data.design_settings) setDesign({ ...DEFAULT_DESIGN, ...data.design_settings })
        if (data.role_type === 'admin') loadTeam()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadTeam() {
    setLoadingTeam(true)
    try {
      const res = await fetch('/api/school/teachers')
      const data = await res.json()
      setSchoolTeachers(data.teachers || [])
    } finally {
      setLoadingTeam(false)
    }
  }

  async function handleSave() {
    if (!fullName.trim()) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/teachers/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setTeacher((prev) => (prev ? { ...prev, full_name: data.full_name } : prev))
        setSaveMsg('Guardado')
        setTimeout(() => setSaveMsg(''), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handlePersonalizationSave() {
    setSavingP(true)
    setSavePMsg('')
    try {
      const res = await fetch('/api/teachers/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: materia.trim(),
          teaching_style: teachingStyle.trim(),
          profile_notes: profileNotes.trim(),
          english_period_minutes: periodMinutes,
        }),
      })
      setSavePMsg(res.ok ? 'Guardado' : 'No se pudo guardar')
      setTimeout(() => setSavePMsg(''), 2500)
    } finally {
      setSavingP(false)
    }
  }

  async function handleDesignSave() {
    setSavingD(true)
    setSaveDMsg('')
    try {
      const res = await fetch('/api/teachers/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design_settings: design }),
      })
      setSaveDMsg(res.ok ? 'Guardado' : 'No se pudo guardar')
      setTimeout(() => setSaveDMsg(''), 2500)
      // The shell reads app_font/app_color once on mount — reload so the new interface font +
      // color theme apply immediately.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prev = (teacher as any)?.design_settings ?? {}
      const changedShell =
        design.app_font !== (prev.app_font ?? 'default') ||
        design.app_color !== (prev.app_color ?? 'default')
      if (res.ok && changedShell) window.location.reload()
    } finally {
      setSavingD(false)
    }
  }

  async function handleRoleChange(targetId: string, newRole: string) {
    setRoleUpdating(targetId)
    try {
      const res = await fetch(`/api/school/teachers/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_type: newRole }),
      })
      if (res.ok) {
        const data = await res.json()
        setSchoolTeachers((prev) =>
          prev.map((t) => (t.id === targetId ? { ...t, role_type: data.role_type } : t))
        )
      }
    } finally {
      setRoleUpdating(null)
    }
  }

  if (!teacher) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="h-6 bg-muted rounded animate-pulse mb-4 w-1/3" />
        <Card className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse" />
          ))}
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      {/* Workspace header — this is your space */}
      <div className="flex items-center gap-4">
        <InitialsAvatar name={teacher.full_name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold font-display text-text-primary truncate">
            {teacher.full_name || 'Mi perfil'}
          </h1>
          <p className="text-sm text-text-secondary truncate">
            {[teacher.subject, teacher.schools?.name].filter(Boolean).join(' · ') || teacher.email}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <RoleBadge role={teacher.role_type} />
          <SignOutButton variant="button" />
        </div>
      </div>

      <Card className="p-6 space-y-6">
        {/* Identidad */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Nombre
            </label>
            <div className="flex gap-2">
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <Button
                onClick={handleSave}
                disabled={saving || fullName === teacher.full_name}
                className="shrink-0"
              >
                {saving ? 'Guardando...' : saveMsg || 'Guardar'}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Correo
            </label>
            <p className="text-sm text-text-secondary">{teacher.email}</p>
          </div>

          {teacher.editorial && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Editorial
              </label>
              <p className="text-sm text-text-secondary capitalize">{teacher.editorial}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Personalización — feeds planeación + material generation */}
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Personalización</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Esto ayuda a la IA a generar planeaciones y materiales con tu estilo.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Materia / grado que enseñas
            </label>
            <Input
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              placeholder="Ej: Inglés preescolar, Kinder 3"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Tu estilo de enseñanza
            </label>
            <Input
              value={teachingStyle}
              onChange={(e) => setTeachingStyle(e.target.value)}
              placeholder="Ej: lúdico, basado en juego, mucha música y movimiento"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Notas para la IA (gustos, materiales favoritos, contexto)
            </label>
            <textarea
              value={profileNotes}
              onChange={(e) => setProfileNotes(e.target.value)}
              rows={4}
              placeholder="Ej: Me gustan los proyectos sobre naturaleza. Tengo pocos recursos de impresión. Mis alumnos disfrutan las canciones."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Duración de tu clase/periodo (minutos)
            </label>
            <input
              type="number"
              min={15}
              max={120}
              step={5}
              value={periodMinutes}
              onChange={(e) => setPeriodMinutes(Number(e.target.value))}
              className="h-10 w-32 rounded-sm border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <p className="text-xs text-text-muted">
              La IA distribuye las actividades para ocupar este tiempo.
            </p>
          </div>

          <Button onClick={handlePersonalizationSave} disabled={savingP}>
            {savingP ? 'Guardando...' : savePMsg || 'Guardar personalización'}
          </Button>
        </div>

        <Separator />

        {/* SECTION 1 — Diseño de mis planeaciones (the printed/generated document, NOT the app) */}
        <div className="rounded-xl border-2 border-border-strong bg-card p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              📄 Diseño de mis planeaciones
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Cómo se ven tus <strong>documentos de planeación</strong> (la hoja que imprimes). No
              cambia la app. También puedes ajustarlo dentro de cada planeación.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Tipografía
              </label>
              <select
                value={design.font}
                onChange={(e) =>
                  setDesign((d) => ({ ...d, font: e.target.value as DesignSettings['font'] }))
                }
                className="w-full h-10 rounded-sm border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {FONT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Tamaño de texto: {design.size}px
              </label>
              <input
                type="range"
                min={12}
                max={22}
                step={1}
                value={design.size}
                onChange={(e) => setDesign((d) => ({ ...d, size: Number(e.target.value) }))}
                className="w-full accent-brand"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Interlineado
              </label>
              <select
                value={design.spacing}
                onChange={(e) =>
                  setDesign((d) => ({ ...d, spacing: e.target.value as DesignSettings['spacing'] }))
                }
                className="w-full h-10 rounded-sm border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {SPACING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Líneas de tablas
              </label>
              <select
                value={design.lineIntensity}
                onChange={(e) =>
                  setDesign((d) => ({
                    ...d,
                    lineIntensity: e.target.value as DesignSettings['lineIntensity'],
                  }))
                }
                className="w-full h-10 rounded-sm border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {INTENSITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Color de acento
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDesign((d) => ({ ...d, accent: c }))}
                  aria-label={`Acento ${c}`}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    design.accent === c
                      ? 'border-text-primary scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleDesignSave} disabled={savingD}>
            {savingD ? 'Guardando...' : saveDMsg || 'Guardar diseño de planeaciones'}
          </Button>
        </div>

        {/* SECTION 2 — Diseño de la aplicación (the whole interface: font + color environment) */}
        <div className="rounded-xl border-2 border-brand/50 bg-brand-subtle/50 p-5 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              🎨 Diseño de la aplicación
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Personaliza <strong>toda la interfaz</strong> — dashboard, menú, botones, fondos,
              tarjetas y juegos. (Distinto del diseño de tus planeaciones de arriba.)
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Tipografía de la aplicación
            </label>
            <select
              value={design.app_font}
              onChange={(e) =>
                setDesign((d) => ({ ...d, app_font: e.target.value as DesignSettings['app_font'] }))
              }
              className="w-full h-10 max-w-sm rounded-sm border border-border bg-card px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {APP_FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Color de la aplicación
            </label>
            <p className="text-xs text-text-secondary">
              Cambia el ambiente de color completo: botones, menú, fondos y tarjetas.
            </p>
            <div className="flex flex-wrap gap-2">
              {APP_COLOR_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setDesign((d) => ({ ...d, app_color: o.value }))}
                  title={o.label}
                  aria-label={o.label}
                  className={`flex h-10 items-center gap-2 rounded-lg border-2 bg-card px-3 transition-transform ${
                    design.app_color === o.value
                      ? 'border-text-primary scale-105 shadow-md'
                      : 'border-transparent hover:scale-105'
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: o.swatch }}
                  />
                  <span className="text-xs text-text-primary">{o.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleDesignSave} disabled={savingD}>
            {savingD ? 'Guardando...' : saveDMsg || 'Guardar diseño de la app'}
          </Button>
        </div>

        <Separator />

        {/* Escuela */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Mi escuela</h2>
          {teacher.schools ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-text-secondary">Nombre</p>
                <p className="text-sm text-text-primary font-medium">{teacher.schools.name}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Ciudad</p>
                <p className="text-sm text-text-primary">{teacher.schools.city}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Plan</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                  {teacher.schools.plan}
                </span>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Grupos</p>
                <p className="text-sm text-text-primary">{teacher.group_count}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Sin escuela asignada</p>
          )}
        </div>

        {/* Mi equipo — solo admin */}
        {teacher.role_type === 'admin' && (
          <>
            <Separator />
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-text-primary">Mi equipo</h2>
              {loadingTeam ? (
                <p className="text-sm text-text-secondary">Cargando...</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs font-semibold text-text-secondary">
                        Nombre
                      </th>
                      <th className="text-left py-2 text-xs font-semibold text-text-secondary">
                        Rol
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolTeachers.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0">
                        <td className="py-2">
                          <p className="font-medium text-text-primary">{t.full_name}</p>
                          <p className="text-xs text-text-secondary">{t.email}</p>
                        </td>
                        <td className="py-2">
                          {t.id === teacher.id ? (
                            <RoleBadge role={t.role_type} />
                          ) : (
                            <select
                              value={t.role_type}
                              disabled={roleUpdating === t.id}
                              onChange={(e) => handleRoleChange(t.id, e.target.value)}
                              className="text-xs border border-border rounded px-2 py-1 bg-surface text-text-primary"
                            >
                              <option value="teacher">Maestra</option>
                              <option value="coordinator">Coordinadora</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted truncate">{teacher.email}</span>
          <SignOutButton variant="button" />
        </div>
      </Card>
    </div>
  )
}
