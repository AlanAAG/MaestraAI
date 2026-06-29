'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Looping background music for games, with a mute toggle. Default OFF (preschool classrooms);
// playback starts on the first toggle click (a user gesture, which browsers require for audio).
export function useGameAudio(src = '/sounds/bg_music.mp3', volume = 0.22) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

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

  const toggle = useCallback(() => {
    const a = ref.current
    if (!a) return
    if (a.paused) {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    } else {
      a.pause()
      setPlaying(false)
    }
  }, [])

  return { playing, toggle }
}
