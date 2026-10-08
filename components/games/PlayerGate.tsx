'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GameShell } from '@/components/games/GameShell'
import type { GameResult } from '@/hooks/useGameScore'

// The child's play profile lives in this device's localStorage: nickname + avatar only.
// No email, no password, no real name. The 6-char code is what a parent types once in /familia
// to see their child's aciertos.
type Player = { id: string; nickname: string; avatar: string; code: string }
type PendingAttempt = GameResult & { durationS: number; attemptId: string; playerId: string }
const STORAGE_KEY = 'maestraia_player'

const AVATARS = ['🐣', '🐱', '🐶', '🦊', '🐨', '🦄', '🐢', '🐝', '🐙', '🦖', '🌟', '🚀']

export function PlayerGate({
  token,
  type,
  content,
  vocabulary,
  minCorrect,
  initialPlayer,
  teacherId,
}: {
  token: string
  type: string
  content: Record<string, unknown>
  vocabulary: string[]
  minCorrect?: number | null
  /** Server-resolved linked profile (signed-in parent) — skips the nickname gate. */
  initialPlayer?: Player | null
  teacherId: string
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
  const [pendingResults, setPendingResults] = useState<PendingAttempt[]>([])
  const attempts = useRef<PendingAttempt[]>([])
  const inFlight = useRef(false)
  const [sendingResult, setSendingResult] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const queueKey = `maestraia_results:${teacherId}:${token}`

  const persistAttempts = useCallback(
    (items: PendingAttempt[]) => {
      attempts.current = items
      setPendingResults(items)
      try {
        if (items.length) localStorage.setItem(queueKey, JSON.stringify(items))
        else localStorage.removeItem(queueKey)
      } catch {
        /* blocked storage: retries remain available for this visit */
      }
    },
    [queueKey]
  )

  const flushResults = useCallback(async () => {
    if (inFlight.current || !attempts.current.length) return
    inFlight.current = true
    setSendingResult(true)
    setResultMessage('Guardando avance…')
    try {
      while (attempts.current.length) {
        const r = attempts.current[0]
        const res = await fetch(`/api/game/${token}/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attempt_id: r.attemptId,
            player_id: r.playerId,
            correct: r.correct,
            total: r.total,
            duration_s: r.durationS,
          }),
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) throw new Error()
        persistAttempts(attempts.current.filter((item) => item.attemptId !== r.attemptId))
      }
      setResultMessage('Avance guardado para tu maestra ✓')
    } catch {
      setResultMessage('No se guardó el avance. Toca Reintentar cuando tengas internet.')
    } finally {
      inFlight.current = false
      setSendingResult(false)
    }
  }, [token, persistAttempts])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(queueKey) ?? '[]')
      attempts.current = Array.isArray(stored)
        ? stored.filter(
            (r: PendingAttempt) =>
              r?.attemptId && r?.playerId && Number.isInteger(r.total) && r.total > 0
          )
        : []
      setPendingResults(attempts.current)
    } catch {
      attempts.current = []
      setPendingResults([])
    }
    void flushResults()
    const online = () => {
      void flushResults()
    }
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
  }, [queueKey, flushResults])

  useEffect(() => {
    // A server-resolved profile wins over whatever this device stored (shared devices).
    setPlayer(initialPlayer ?? null)
    setSkipped(false)
    if (!initialPlayer) {
      try {
        const raw = localStorage.getItem(`${STORAGE_KEY}:${teacherId}`)
        if (raw) {
          const saved = JSON.parse(raw) as Player
          if (saved?.id && saved?.nickname && saved?.code) setPlayer(saved)
        }
      } catch {
        /* first visit / blocked storage → the child just creates a profile */
      }
    }
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, initialPlayer])

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
        localStorage.setItem(`${STORAGE_KEY}:${teacherId}`, JSON.stringify(data))
      } catch {
        /* storage blocked → profile lasts for this visit only */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude crear el perfil.')
    } finally {
      setSaving(false)
    }
  }

  function saveResult(r: GameResult & { durationS: number }) {
    if (!player) return
    persistAttempts([
      ...attempts.current,
      { ...r, attemptId: crypto.randomUUID(), playerId: player.id },
    ])
    void flushResults()
  }

  function changePlayer() {
    try {
      localStorage.removeItem(`${STORAGE_KEY}:${teacherId}`)
    } catch {
      /* blocked storage */
    }
    setPlayer(null)
    setResultMessage('')
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
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {showCode ? 'Ocultar código' : 'Mi código'}
          </button>
          <button
            type="button"
            onClick={changePlayer}
            className="text-xs text-primary hover:underline"
          >
            Cambiar jugador
          </button>
        </div>
      </div>
      {showCode && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center">
          <p className="text-xs text-gray-600">
            Comparte este código con tu maestra para asociar tus aciertos a tu nombre.
          </p>
          <p className="mt-1 text-2xl font-bold tracking-[0.3em] text-primary">{player.code}</p>
        </div>
      )}
      <GameShell
        key={player.id}
        type={type}
        content={content}
        vocabulary={vocabulary}
        minCorrect={minCorrect}
        onResult={saveResult}
      />
      {resultMessage && (
        <div
          role="status"
          className="rounded-xl bg-white px-4 py-3 text-center text-sm text-gray-700"
        >
          {resultMessage}
          {pendingResults.length > 0 && !sendingResult && (
            <button
              type="button"
              onClick={() => void flushResults()}
              className="ml-2 font-semibold text-primary underline"
            >
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
