'use client'
import { useCallback, useRef } from 'react'

export type GameResult = { correct: number; total: number }

/**
 * Uniform "aciertos" counter for the games. Each game reports a miss for the item the child got
 * wrong; at the end it asks for the result over the total number of items.
 * ponytail: aciertos = items solved without a wrong try. Enough for homework ("llega a X aciertos");
 * upgrade to per-attempt analytics only if the teacher ever asks for it.
 */
export function useGameScore() {
  const missed = useRef<Set<string>>(new Set())

  const miss = useCallback((key: string | number) => {
    missed.current.add(String(key))
  }, [])

  const reset = useCallback(() => {
    missed.current = new Set()
  }, [])

  const result = useCallback(
    (total: number): GameResult => ({
      correct: Math.max(0, total - missed.current.size),
      total,
    }),
    []
  )

  return { miss, reset, result }
}
