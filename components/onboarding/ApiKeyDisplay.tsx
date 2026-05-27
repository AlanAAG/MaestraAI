// components/onboarding/ApiKeyDisplay.tsx
// Display API key once with copy button and security warning

'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, AlertTriangle } from 'lucide-react'

interface ApiKeyDisplayProps {
  apiKey: string
  keyPrefix: string
}

export function ApiKeyDisplay({ apiKey, keyPrefix }: ApiKeyDisplayProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex gap-3">
        <AlertTriangle className="text-amber-600 shrink-0" size={20} />
        <div className="text-sm">
          <p className="font-medium text-amber-900 mb-1">⚠️ Guarda esta clave ahora</p>
          <p className="text-amber-700">
            Esta es la única vez que verás la clave completa. Cópiala y guárdala en un lugar seguro.
            La necesitarás para configurar la extensión de Chrome.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-surface border border-border">
        <label className="block text-xs font-medium text-text-secondary mb-2">Tu clave API</label>
        <div className="flex gap-2 items-center">
          <code className="flex-1 px-3 py-2 rounded bg-bg text-sm font-mono text-text-primary break-all">
            {apiKey}
          </code>
          <Button onClick={handleCopy} variant="outline" className="min-h-[40px] shrink-0">
            {copied ? (
              <>
                <Check size={16} className="mr-2" />
                Copiado
              </>
            ) : (
              <>
                <Copy size={16} className="mr-2" />
                Copiar
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-text-disabled mt-2">
          Identificador: <span className="font-mono">{keyPrefix}...</span>
        </p>
      </div>

      <div className="p-3 rounded-lg bg-surface border border-border">
        <p className="text-xs text-text-secondary">
          💡 <strong>Próximo paso:</strong> Instalarás la extensión de Chrome y pegarás esta clave
          para sincronizar automáticamente tus datos de Richmond LP.
        </p>
      </div>
    </div>
  )
}
