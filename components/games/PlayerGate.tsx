'use client'
import { useEffect, useState } from 'react'
import { GameShell } from '@/components/games/GameShell'
import type { GameResult } from '@/hooks/useGameScore'

// The child's play profile lives in this device's localStorage: nickname + avatar only.
// No email, no password, no real name. The 6-char code is what a parent types once in /familia
// to see their child's aciertos.
type Player = { id: string; nickname: string; avatar: string; code: string }
const STORAGE_KEY = 'maestraia_player'

const AVATARS = ['🐣', '🐱', '🐶', '🦊', '🐨', '🦄', '🐢', '🐝', '🐙', '🦖', '🌟', '🚀']

export function PlayerGate({
  token,
  type,
  content,
  vocabulary,
  minCorrect,
  initialPlayer,
}: {
  token: string
  type: string
  content: Record<string, unknown>
  vocabulary: string[]
  minCorrect?: number | null
  /** Server-resolved linked profile (signed-in parent) — skips the nickname gate. */
  initialPlayer?: Player | null
}) {
  const [player, setPlayer] = useState<Player | null>(initialPlayer ?? null)
  const [ready, setReady] = useState(false)
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showCode, setShowCode] = useState(false)
  // Escape hatch: profiles are a nicety, never a wall between a child and the game.
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    // A server-resolved profile wins over whatever this device stored (shared devices).
    if (!initialPlayer) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) setPlayer(JSON.parse(raw))
      } catch {
        /* first visit / blocked storage → the child just creates a profile */
      }
    }
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createProfile() {
    if (!nickname.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/game/${token}/player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), avatar }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No pude crear el perfil.')
      setPlayer(data)
      setShowCode(true)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        /* storage blocked → profile lasts for this visit only */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude crear el perfil.')
    } finally {
      setSaving(false)
    }
  }

  // Best-effort: a lost result must never block the child from playing.
  async function saveResult(r: GameResult & { durationS: number }) {
    if (!player) return
    try {
      await fetch(`/api/game/${token}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          correct: r.correct,
          total: r.total,
          duration_s: r.durationS,
        }),
      })
    } catch {
      /* offline → the run simply isn't recorded */
    }
  }

  if (!ready) return null

  if (!player && skipped) {
    return (
      <GameShell type={type} content={content} vocabulary={vocabulary} minCorrect={minCorrect} />
    )
  }

  if (!player) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-800">¿Quién va a jugar?</p>
        <p className="mt-1 text-sm text-gray-500">Elige tu monito y escribe tu apodo.</p>
        <div className="mt-4 grid grid-cols-6 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAvatar(a)}
              className={`rounded-xl border-2 py-2 text-2xl transition-transform active:scale-95 ${
                avatar === a ? 'border-primary bg-primary/10 scale-110' : 'border-gray-200'
              }`}
              aria-label={`Elegir ${a}`}
            >
              {a}
            </button>
          ))}
        </div>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={24}
          placeholder="Mi apodo"
          className="mt-4 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-lg focus:border-primary focus:outline-none"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={createProfile}
          disabled={saving || !nickname.trim()}
          className="mt-4 w-full rounded-full bg-primary px-6 py-3 text-lg font-semibold text-white shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Un momento…' : '¡Listo!'}
        </button>
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="mt-3 text-xs text-gray-400 underline"
        >
          Jugar sin guardar mis aciertos
        </button>
        <p className="mt-3 text-[11px] text-gray-400">
          No pedimos nombre real, correo ni contraseña.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2">
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span className="text-xl">{player.avatar}</span> {player.nickname}
        </span>
        <button
          type="button"
          onClick={() => setShowCode((v) => !v)}
          className="text-xs text-primary hover:underline"
        >
          {showCode ? 'Ocultar código' : 'Mi código'}
        </button>
      </div>
      {showCode && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center">
          <p className="text-xs text-gray-600">
            Papá o mamá: escribe este código en tu cuenta para ver los aciertos.
          </p>
          <p className="mt-1 text-2xl font-bold tracking-[0.3em] text-primary">{player.code}</p>
        </div>
      )}
      <GameShell
        type={type}
        content={content}
        vocabulary={vocabulary}
        minCorrect={minCorrect}
        onResult={saveResult}
      />
    </div>
  )
}
