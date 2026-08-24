// Read-only list of school-wide announcements, shared by /escuela, /familia and the dashboard.
import type { SchoolAnnouncement } from '@/lib/school/announcements'
import { NewBadge } from '@/components/parents/NewBadge'

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-warning-light text-warning-text',
  normal: 'bg-surface text-text-secondary',
}
const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Importante',
  normal: 'Aviso',
}

export function SchoolAnnouncements({
  items,
  showNewBadge = false,
}: {
  items: SchoolAnnouncement[]
  /** /familia only: mark announcements newer than this device's last visit. */
  showNewBadge?: boolean
}) {
  if (!items.length) return null
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id} className="bg-surface border border-border rounded-xl px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">
                🏫 {a.title}
                {showNewBadge && <NewBadge date={a.published_at} />}
              </p>
              <p className="mt-1 whitespace-pre-line text-xs text-text-secondary">{a.content}</p>
              <p className="mt-1 text-xs text-text-muted">
                {new Date(a.published_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
            <span
              className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full ${
                PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.normal
              }`}
            >
              {PRIORITY_LABELS[a.priority] ?? 'Aviso'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
