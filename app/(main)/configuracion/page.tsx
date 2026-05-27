'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { GroupList } from '@/components/settings/GroupList'
import { GroupEditor } from '@/components/settings/GroupEditor'
import { StudentRoster } from '@/components/settings/StudentRoster'
import { ApiKeyManager } from '@/components/settings/ApiKeyManager'
import { X } from 'lucide-react'

type ViewMode = 'list' | 'create' | 'edit' | 'students'

export default function ConfiguracionPage() {
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
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [groupMode, setGroupMode] = useState<ViewMode>('list')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [generatedKey, setGeneratedKey] = useState<{ key: string; key_prefix: string } | null>(null)

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

      // Load teacher
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacherData } = await (supabase as any)
        .from('teachers')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      if (teacherData) {
        setTeacher(teacherData)
        setFullName(teacherData.full_name || '')

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
            richmond_group_slug,
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

        // Load API keys
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: keysData } = await (supabase as any)
          .from('api_keys')
          .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
          .eq('teacher_id', teacherData.id)
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
      await (supabase as any).from('teachers').update({ full_name: fullName }).eq('id', teacher.id)
    }

    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    await loadData()
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
      richmond_group_slug: data.richmond_group_slug || null,
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
        richmond_group_slug: data.richmond_group_slug || null,
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

      await loadData()
      setGeneratedKey(null)
    } catch (err) {
      console.error('Failed to revoke API key:', err)
      alert('Error al revocar la clave')
    }
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)
  const selectedGroupData =
    groupMode === 'edit' && selectedGroup
      ? {
          name: selectedGroup.name,
          grade: selectedGroup.grade,
          academic_year: selectedGroup.academic_year,
          richmond_group_slug: selectedGroup.richmond_group_slug || '',
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
              value={teacher?.email || ''}
              disabled
              className="min-h-[44px] bg-bg text-text-disabled"
            />
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

      {/* School Section */}
      {school && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Escuela</h2>
          <div className="space-y-2">
            <p className="text-text-primary font-medium">{school.name}</p>
            <p className="text-sm text-text-secondary">
              {school.city}, {school.state}
            </p>
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

      {/* Richmond Integration Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Integración Richmond</h2>
        <p className="text-sm text-text-secondary mb-4">
          Genera claves API para sincronizar automáticamente datos de Richmond LP con la extensión
          de Chrome.
        </p>
        <ApiKeyManager
          apiKeys={apiKeys}
          onGenerate={handleGenerateApiKey}
          onRevoke={handleRevokeApiKey}
          generatedKey={generatedKey}
          loading={loading}
        />
      </Card>
    </div>
  )
}
