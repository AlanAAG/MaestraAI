'use client'
// "Activar notificaciones" for families: registers /sw.js, subscribes with the VAPID public
// key and stores the subscription server-side. Renders nothing when push is unsupported,
// not configured, or already granted+subscribed on this device.
import { useEffect, useState } from 'react'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function PushOptIn() {
  const [state, setState] = useState<'hidden' | 'available' | 'working' | 'done' | 'denied'>(
    'hidden'
  )

  useEffect(() => {
    if (!PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return
    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription()
      setState(sub ? 'done' : 'available')
    })
  }, [])

  async function enable() {
    setState('working')
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY!),
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setState(res.ok ? 'done' : 'available')
    } catch {
      setState('available')
    }
  }

  if (state === 'hidden') return null
  if (state === 'done') {
    return (
      <p className="text-xs text-text-secondary">
        🔔 Notificaciones activadas en este dispositivo.
      </p>
    )
  }
  if (state === 'denied') {
    return (
      <p className="text-xs text-text-secondary">
        Las notificaciones están bloqueadas para este sitio — actívalas en la configuración de tu
        navegador.
      </p>
    )
  }
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm text-text-primary">
        🔔 Recibe un aviso cuando la maestra publique tareas o anuncios.
      </p>
      <button
        onClick={enable}
        disabled={state === 'working'}
        className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {state === 'working' ? 'Activando…' : 'Activar notificaciones'}
      </button>
    </div>
  )
}
