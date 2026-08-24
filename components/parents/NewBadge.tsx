'use client'
// "Nuevo" chip for /familia: anything published after this device's last visit gets a dot.
// ponytail: localStorage per device, no server state — upgrade to per-account last_seen if
// families ask for cross-device consistency.
import { useEffect, useState } from 'react'

const KEY = 'maestraia_familia_seen'

// Snapshot the previous visit ONCE per page load, before MarkSeen overwrites it.
let snapshot: string | null | undefined
function lastSeen(): string | null {
  if (snapshot === undefined) {
    try {
      snapshot = localStorage.getItem(KEY)
    } catch {
      snapshot = null
    }
  }
  return snapshot
}

export function NewBadge({ date }: { date: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const seen = lastSeen()
    // First visit ever → no badges (everything would be "new", which means nothing).
    setShow(!!seen && date > seen)
  }, [date])
  if (!show) return null
  return (
    <span className="ml-2 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white align-middle">
      Nuevo
    </span>
  )
}

/** Mount once per /familia page view: records "seen up to now" after NewBadge snapshotted. */
export function MarkSeen() {
  useEffect(() => {
    lastSeen() // ensure the snapshot is taken first
    try {
      localStorage.setItem(KEY, new Date().toISOString())
    } catch {
      /* storage blocked → badges simply never show */
    }
  }, [])
  return null
}
