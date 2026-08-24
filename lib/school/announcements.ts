// School-wide announcements (table from migration 010, written from /red). These helpers
// surface them to the portal, families and the teacher dashboard.

export interface SchoolAnnouncement {
  id: string
  title: string
  content: string
  priority: 'normal' | 'high' | 'urgent'
  published_at: string
  expires_at: string | null
}

/** Not expired at `now` (ISO string). Pure — unit-tested. */
export function isActive(a: { expires_at: string | null }, now: string): boolean {
  return !a.expires_at || a.expires_at > now
}

/** Latest active announcements for a school. Best-effort → []. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActiveAnnouncements(client: any, schoolId: string, limit = 10) {
  try {
    const { data } = await client
      .from('school_announcements')
      .select('id, title, content, priority, published_at, expires_at')
      .eq('school_id', schoolId)
      .order('published_at', { ascending: false })
      .limit(limit * 2) // headroom: expired rows are filtered below
    const now = new Date().toISOString()
    return ((data ?? []) as SchoolAnnouncement[]).filter((a) => isActive(a, now)).slice(0, limit)
  } catch {
    return []
  }
}
