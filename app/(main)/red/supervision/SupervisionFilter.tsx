'use client'

import { useState } from 'react'
import { TYPE_LABELS } from '@/lib/parents/child-data'

interface StaffRow {
  id: string
  full_name: string
  role_type: string
}

interface Summary {
  teacherId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  planes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materiales: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posts: any[]
}

interface Props {
  staff: StaffRow[]
  byTeacher: Record<string, Summary>
  diaryCountByTeacher: Record<string, number>
  pendingRequestsByTeacher: Record<string, number>
}

function fmt(d: string | null): string {
  return d
    ? new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    : ''
}

export function SupervisionFilter({
  staff,
  byTeacher,
  diaryCountByTeacher,
  pendingRequestsByTeacher,
}: Props) {
  const [query, setQuery] = useState('')
  const filtered = staff.filter((t) => t.full_name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-6">
      <input
        type="search"
        placeholder="Buscar maestra…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl border border-border px-4 py-2 text-sm bg-card"
      />

      {filtered.map((t) => {
        const s = byTeacher[t.id]
        const diaryCount = diaryCountByTeacher[t.id] ?? 0
        const pendingReqs = pendingRequestsByTeacher[t.id] ?? 0

        return (
          <section key={t.id} className="rounded-xl border-2 border-border bg-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">{t.full_name}</h2>
                <p className="text-xs text-text-secondary">
                  {t.role_type === 'admin'
                    ? 'Dirección'
                    : t.role_type === 'coordinator'
                      ? 'Coordinación'
                      : 'Docente'}
                </p>
              </div>

              {/* Quick stat chips */}
              <div className="flex gap-3 text-center shrink-0">
                <div>
                  <p className="text-sm font-bold text-text-primary">{s?.planes.length ?? 0}</p>
                  <p className="text-[10px] text-text-secondary">Planes</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{s?.materiales.length ?? 0}</p>
                  <p className="text-[10px] text-text-secondary">Juegos</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{diaryCount}</p>
                  <p className="text-[10px] text-text-secondary">Diarios</p>
                </div>
                {pendingReqs > 0 && (
                  <div>
                    <p className="text-sm font-bold text-warning">{pendingReqs}</p>
                    <p className="text-[10px] text-text-secondary">Solicitudes</p>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">
              Planeaciones ({s?.planes.length ?? 0})
            </h3>
            {s?.planes.length ? (
              <ul className="mb-3 space-y-1">
                {s.planes.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-primary truncate">
                      {p.project_name ?? p.plan_type}
                    </span>
                    <span className="shrink-0 text-xs text-text-secondary">
                      {fmt(p.start_date)} – {fmt(p.end_date)}
                      {p.status ? ` · ${p.status}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-text-secondary">Sin planeaciones.</p>
            )}

            <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">
              Materiales y juegos ({s?.materiales.length ?? 0})
            </h3>
            {s?.materiales.length ? (
              <ul className="mb-3 space-y-1">
                {s.materiales.slice(0, 6).map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-primary truncate">
                      {m.title ?? TYPE_LABELS[m.type] ?? m.type}
                    </span>
                    <span className="shrink-0 text-xs text-text-secondary">
                      {TYPE_LABELS[m.type] ?? m.type}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-text-secondary">Sin materiales.</p>
            )}

            <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">
              Anuncios del grupo ({s?.posts.length ?? 0})
            </h3>
            {s?.posts.length ? (
              <ul className="space-y-1">
                {s.posts.slice(0, 4).map((g) => (
                  <li key={g.id} className="text-sm text-text-primary truncate">
                    {g.kind === 'tarea' ? '📝' : '📣'} {g.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">Sin anuncios.</p>
            )}
          </section>
        )
      })}

      {filtered.length === 0 && query && (
        <p className="text-center text-sm text-text-secondary py-8">
          Sin resultados para &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  )
}
