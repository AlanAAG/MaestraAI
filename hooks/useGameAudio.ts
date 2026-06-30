'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Looping background music for games. Browsers block autoplay until a user gesture, so call
// `play()` from the Start button click (a gesture). After that it plays by default; the mute
// button stops it. `muted` reflects the teacher's choice and survives pause/resume.
export function useGameAudio(src = '/sounds/bg_music.mp3', volume = 0.22) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const a = new Audio(src)
    a.loop = true
    a.volume = volume
    ref.current = a
    return () => {
      a.pause()
      ref.current = null
    }
  }, [src, volume])

  // Start playback (from a user gesture) unless the teacher has muted.
  const play = useCallback(() => {
    const a = ref.current
    if (a && a.paused && !muted) a.play().catch(() => {})
  }, [muted])

  const pause = useCallback(() => {
    ref.current?.pause()
  }, [])

  // Mute = stop hearing; unmute = resume.
  const toggleMute = useCallback(() => {
    const a = ref.current
    setMuted((m) => {
      const next = !m
      if (next) a?.pause()
      else a?.play().catch(() => {})
      return next
    })
  }, [])

  return { muted, play, pause, toggleMute }
}
