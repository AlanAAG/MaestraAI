'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Megaphone } from 'lucide-react'
import { activeGroups } from '@/lib/groups/archive'

type Group = { id: string; name: string; grade: string; students: number }

export default function GruposPage() {
  const [groups, setGroups] = useState<Group[] | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .single()
      if (!teacher) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: raw } = await (supabase as any)
        .from('groups')
        .select('id, name, grade, archived_at, students(id)')
        .eq('titular_teacher_id', teacher.id)
        .order('name')
      const active = activeGroups<{
        id: string
        name: string
        grade: string
        archived_at?: string | null
        students?: { id: string }[]
      }>(raw ?? [])
      setGroups(
        active.map((g) => ({
          id: g.id,
          name: g.name,
          grade: g.grade,
          students: g.students?.length ?? 0,
        }))
      )
    }
    load()
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold font-display text-text-primary">Mis grupos</h1>
      <p className="text-sm text-text-secondary mt-1 mb-6">
        El muro de cada grupo: anuncios y tareas que llegan por correo a las familias.
      </p>
      {groups === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : groups.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">
          Aún no tienes grupos. Créalos en{' '}
          <Link href="/configuracion" className="text-primary underline">
            Configuración
          </Link>
          .
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <Link key={g.id} href={`/grupos/${g.id}`}>
              <Card className="p-5 border-2 transition-colors hover:border-primary cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">{g.name}</h2>
                    <p className="text-sm text-text-secondary">{g.grade}</p>
                  </div>
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-sm text-text-secondary">
                  <Users size={15} /> {g.students} alumno{g.students === 1 ? '' : 's'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
