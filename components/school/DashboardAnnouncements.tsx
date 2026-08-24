'use client'
// Small dashboard card with the latest active school-wide announcements. Reads under the
// existing teacher-select RLS on school_announcements (010) — best-effort, renders nothing
// when there's no school or no active avisos.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isActive, type SchoolAnnouncement } from '@/lib/school/announcements'

export function DashboardAnnouncements() {
  const [items, setItems] = useState<SchoolAnnouncement[]>([])

  useEffect(() => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('school_announcements')
      .select('id, title, content, priority, published_at, expires_at')
      .order('published_at', { ascending: false })
      .limit(6)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: any) => {
        const now = new Date().toISOString()
        setItems(((data ?? []) as SchoolAnnouncement[]).filter((a) => isActive(a, now)).slice(0, 3))
      })
  }, [])

  if (!items.length) return null

  return (
    <div className="mb-6 rounded-lg bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-text-primary">🏫 Avisos de la escuela</h2>
        <Link href="/red" className="text-xs text-primary underline">
          Ver todos
        </Link>
      </div>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="text-sm">
            <span className="font-medium text-text-primary">
              {a.priority === 'urgent' ? '🔴 ' : a.priority === 'high' ? '🟡 ' : ''}
              {a.title}
            </span>
            <span className="text-text-secondary"> — {a.content.slice(0, 120)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
