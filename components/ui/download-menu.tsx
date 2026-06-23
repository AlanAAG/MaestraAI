'use client'
import { useEffect, useRef, useState } from 'react'
import { Download, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type DownloadItem = {
  label: string
  icon?: React.ReactNode
  onSelect: () => void | Promise<void>
}

// Reusable multi-format download dropdown. Pass the format options each surface supports
// (e.g. PDF, Word, Copiar enlace). Closes on outside-click / Escape.
export function DownloadMenu({
  items,
  label = 'Descargar',
  busy = false,
  className = '',
}: {
  items: DownloadItem[]
  label?: string
  busy?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <Button
        variant="outline"
        className="min-h-[44px]"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
      >
        {busy ? (
          <Loader2 size={16} className="mr-2 animate-spin" />
        ) : (
          <Download size={16} className="mr-2" />
        )}
        {label}
        <ChevronDown size={14} className="ml-2 opacity-70" />
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-border bg-surface shadow-lg py-1">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={async () => {
                setOpen(false)
                await it.onSelect()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-muted text-left"
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
