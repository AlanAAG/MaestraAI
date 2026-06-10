'use client'
import { useCallback, useRef } from 'react'

export function useSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string, lang: 'en-US' | 'es-MX' = 'en-US') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.7
    utterance.pitch = 1.1
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  return { speak, stop }
}
