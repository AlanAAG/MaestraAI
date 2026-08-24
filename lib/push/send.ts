// Web Push sender. Best-effort by design: a failed push must never fail the request that
// triggered it. Dead subscriptions (404/410) are pruned as we go.
import 'server-only'
import webpush from 'web-push'

export interface PushPayload {
  title: string
  body: string
  /** Where a tap takes the user (default /familia). */
  url?: string
}

function configured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

let vapidSet = false
function ensureVapid() {
  if (vapidSet) return
  webpush.setVapidDetails(
    'mailto:notificaciones@maestraia.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  vapidSet = true
}

/** Push `payload` to every subscription of the given auth ids. Returns sent count. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendPushToAuthIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  authIds: string[],
  payload: PushPayload
): Promise<number> {
  if (!configured() || !authIds.length) return 0
  ensureVapid()

  const { data: subs } = await service
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('auth_id', Array.from(new Set(authIds)))
  if (!subs?.length) return 0

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/familia',
  })
  let sent = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
        { TTL: 60 * 60 * 24 }
      )
      sent++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        // Browser dropped the subscription — clean it up.
        await service.from('push_subscriptions').delete().eq('id', s.id)
      } else {
        console.error('[push] send failed:', status ?? err)
      }
    }
  }
  return sent
}

/** Auth ids of parents with a claimed, unrevoked link to any student of these groups. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parentAuthIdsForGroups(service: any, groupIds: string[]): Promise<string[]> {
  if (!groupIds.length) return []
  try {
    const { data: students } = await service.from('students').select('id').in('group_id', groupIds)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentIds = (students ?? []).map((s: any) => s.id)
    if (!studentIds.length) return []
    const { data: links } = await service
      .from('parent_links')
      .select('parent_auth_id')
      .in('student_id', studentIds)
      .not('parent_auth_id', 'is', null)
      .not('claimed_at', 'is', null)
      .is('revoked_at', null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.from(new Set((links ?? []).map((l: any) => l.parent_auth_id)))
  } catch {
    return []
  }
}
