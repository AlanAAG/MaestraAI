'use client'
import { useCallback, useEffect, useRef } from 'react'

// Picks a natural-sounding voice for the language, preferring local/Google/Microsoft voices.
function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: 'en-US' | 'es-MX'
): SpeechSynthesisVoice | null {
  const prefix = lang.slice(0, 2) // 'en' | 'es'
  const candidates = voices.filter((v) => v.lang?.toLowerCase().startsWith(prefix))
  if (candidates.length === 0) return null
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang?.toLowerCase() === lang.toLowerCase() ? 4 : 0) +
    (/google|natural|microsoft/i.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0)
  return candidates.sort((a, b) => score(b) - score(a))[0] ?? candidates[0]
}

export function useSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  // Voices load asynchronously on some browsers — keep them warm.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices()
    }
    load()
    window.speechSynthesis.addEventListener?.('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load)
  }, [])

  const speak = useCallback((text: string, lang: 'en-US' | 'es-MX' = 'en-US') => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.75
    utterance.pitch = 1.1
    const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices()
    const voice = pickVoice(voices, lang)
    if (voice) utterance.voice = voice
    utteranceRef.current = utterance
    // cancel()→speak() back-to-back is flaky in some browsers; a microtask gap settles it.
    setTimeout(() => synth.speak(utterance), 0)
  }, [])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  return { speak, stop }
}
