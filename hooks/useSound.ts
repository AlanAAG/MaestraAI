'use client'
import { useCallback, useMemo, useRef } from 'react'

// Generated game sound effects via the Web Audio API — no audio assets, no dependency.
// correct = rising ding, wrong = soft low buzz, win = little major arpeggio.
export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = (): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctxRef.current = new Ctor()
    }
    return ctxRef.current
  }

  // Play a sequence of notes (each `dur` seconds) — frequencies in Hz.
  const tone = useCallback(
    (freqs: number[], dur: number, type: OscillatorType = 'sine', gain = 0.14) => {
      const ctx = getCtx()
      if (!ctx) return
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const now = ctx.currentTime
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = type
        osc.frequency.value = f
        const start = now + i * dur
        g.gain.setValueAtTime(0.0001, start)
        g.gain.linearRampToValueAtTime(gain, start + 0.012)
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
        osc.connect(g)
        g.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + dur + 0.02)
      })
    },
    []
  )

  const correct = useCallback(() => tone([660, 990], 0.12, 'sine'), [tone])
  const wrong = useCallback(() => tone([196, 147], 0.16, 'square', 0.09), [tone])
  const win = useCallback(() => tone([523, 659, 784, 1047], 0.15, 'triangle'), [tone])

  // Stable identity so consumers can list it in effect/callback deps without churn.
  return useMemo(() => ({ correct, wrong, win }), [correct, wrong, win])
}
