'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

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
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  coordinator: { label: 'Coordinadora', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  teacher: { label: 'Maestra', className: 'bg-gray-100 text-gray-700 border-gray-200' },
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
  const [savingP, setSavingP] = useState(false)
  const [savePMsg, setSavePMsg] = useState('')

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
        }),
      })
      setSavePMsg(res.ok ? 'Guardado' : 'No se pudo guardar')
      setTimeout(() => setSavePMsg(''), 2500)
    } finally {
      setSavingP(false)
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
      <h1 className="text-2xl font-semibold text-text-primary">Mi perfil</h1>

      <Card className="p-6 space-y-6">
        {/* Identidad */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <RoleBadge role={teacher.role_type} />
          </div>

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

          <Button onClick={handlePersonalizationSave} disabled={savingP}>
            {savingP ? 'Guardando...' : savePMsg || 'Guardar personalización'}
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
      </Card>
    </div>
  )
}
