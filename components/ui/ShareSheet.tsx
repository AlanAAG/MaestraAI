'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, MessageCircle, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ShareSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  title: string
  whatsappText: string
  expiresAt?: Date
  onRenew?: () => Promise<void>
}

export function ShareSheet({
  open,
  onOpenChange,
  url,
  title,
  whatsappText,
  expiresAt,
  onRenew,
}: ShareSheetProps) {
  const [copied, setCopied] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  if (!open) return null

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title, url })
    } catch {
      // user cancelled or not supported
    }
  }

  async function handleRenew() {
    if (!onRenew) return
    setRenewing(true)
    try {
      await onRenew()
    } finally {
      setRenewing(false)
    }
  }

  const expired = expiresAt && expiresAt < new Date()
  const expiryLabel = expiresAt
    ? expired
      ? 'Enlace expirado'
      : `Válido hasta ${expiresAt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`
    : null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-text-muted hover:text-text-primary cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* URL copy row */}
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-inset text-text-secondary truncate"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-inset transition-colors cursor-pointer min-w-[80px] justify-center"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-success" /> ¡Listo!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copiar
              </>
            )}
          </button>
        </div>

        {/* Expiry badge + renew */}
        {expiryLabel && (
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-medium ${expired ? 'text-destructive' : 'text-text-secondary'}`}
            >
              {expiryLabel}
            </span>
            {onRenew && (
              <button
                onClick={handleRenew}
                disabled={renewing}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                {renewing ? 'Renovando…' : 'Renovar enlace'}
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button className="flex-1 gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white" asChild>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>

          {canNativeShare && (
            <Button variant="outline" onClick={handleNativeShare} className="flex-1">
              Compartir
            </Button>
          )}
        </div>

        <p className="text-xs text-text-muted text-center">
          No se necesita cuenta para abrir el enlace
        </p>
      </div>
    </div>
  )
}
