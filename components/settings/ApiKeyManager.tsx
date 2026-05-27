// components/settings/ApiKeyManager.tsx
// Manage API keys: list, generate, revoke

'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus, Key } from 'lucide-react'
import { ApiKeyDisplay } from '@/components/onboarding/ApiKeyDisplay'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

interface ApiKeyManagerProps {
  apiKeys: ApiKey[]
  onGenerate: (name: string) => void
  onRevoke: (id: string) => void
  generatedKey?: { key: string; key_prefix: string } | null
  loading?: boolean
}

export function ApiKeyManager({
  apiKeys,
  onGenerate,
  onRevoke,
  generatedKey,
  loading = false,
}: ApiKeyManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [keyName, setKeyName] = useState('')

  function handleGenerate() {
    if (!keyName.trim()) return
    onGenerate(keyName.trim())
    setKeyName('')
    setShowCreateForm(false)
  }

  const activeKeys = apiKeys.filter((k) => !k.revoked_at)
  const revokedKeys = apiKeys.filter((k) => k.revoked_at)

  return (
    <div className="space-y-4">
      {generatedKey && (
        <div className="p-4 rounded-lg border-2 border-primary bg-primary-light/10">
          <h3 className="font-medium text-text-primary mb-3">✅ Clave generada exitosamente</h3>
          <ApiKeyDisplay apiKey={generatedKey.key} keyPrefix={generatedKey.key_prefix} />
        </div>
      )}

      {!showCreateForm && !generatedKey && (
        <Button
          onClick={() => setShowCreateForm(true)}
          className="w-full min-h-[44px] bg-primary hover:bg-primary-dark"
        >
          <Plus size={16} className="mr-2" />
          Generar nueva clave API
        </Button>
      )}

      {showCreateForm && (
        <div className="p-4 rounded-lg border border-border bg-surface">
          <h3 className="font-medium text-text-primary mb-3">Nueva clave API</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Nombre de la clave
              </label>
              <Input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Ej: Extensión Chrome - MacBook Pro"
                className="min-h-[44px]"
                autoFocus
              />
              <p className="text-xs text-text-disabled mt-1">
                Un nombre descriptivo para identificar dónde usas esta clave
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={loading || !keyName.trim()}
                className="flex-1 min-h-[44px] bg-primary hover:bg-primary-dark"
              >
                {loading ? 'Generando...' : 'Generar'}
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false)
                  setKeyName('')
                }}
                variant="outline"
                className="min-h-[44px]"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeKeys.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3">Claves activas</h3>
          <div className="space-y-2">
            {activeKeys.map((key) => (
              <div
                key={key.id}
                className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Key size={16} className="text-text-disabled" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{key.name}</p>
                    <p className="text-xs text-text-disabled font-mono mt-0.5">
                      {key.key_prefix}...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">
                      Creada: {new Date(key.created_at).toLocaleDateString('es-MX')}
                    </p>
                    {key.last_used_at && (
                      <p className="text-xs text-text-disabled">
                        Último uso: {new Date(key.last_used_at).toLocaleDateString('es-MX')}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => onRevoke(key.id)}
                  variant="outline"
                  size="sm"
                  className="ml-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {revokedKeys.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3">Claves revocadas</h3>
          <div className="space-y-2">
            {revokedKeys.map((key) => (
              <div
                key={key.id}
                className="p-3 rounded-lg border border-border bg-surface opacity-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Key size={16} className="text-text-disabled" />
                  <div>
                    <p className="text-sm font-medium text-text-primary line-through">{key.name}</p>
                    <p className="text-xs text-text-disabled font-mono">
                      {key.key_prefix}... (revocada el{' '}
                      {new Date(key.revoked_at!).toLocaleDateString('es-MX')})
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {apiKeys.length === 0 && !showCreateForm && !generatedKey && (
        <div className="text-center py-8 text-text-secondary">
          <Key size={48} className="mx-auto mb-3 text-text-disabled" />
          <p>No tienes claves API creadas</p>
          <p className="text-sm mt-1">Genera una para usar la extensión de Chrome</p>
        </div>
      )}
    </div>
  )
}
