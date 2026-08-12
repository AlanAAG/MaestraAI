'use client'
import { useState } from 'react'
import { Loader2, Paperclip } from 'lucide-react'

/** Opens a private class file via a fresh signed URL (permission-checked server-side). */
export function AttachmentLink({ path, name }: { path: string; name: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const res = await fetch(`/api/files/sign?path=${encodeURIComponent(path)}`)
          const data = await res.json().catch(() => ({}) as { url?: string })
          if (data.url) window.open(data.url, '_blank', 'noopener')
        } finally {
          setBusy(false)
        }
      }}
      className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary underline disabled:opacity-50"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
      {name}
    </button>
  )
}
