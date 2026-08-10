import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameScore } from './useGameScore'

describe('useGameScore', () => {
  it('counts aciertos as items solved without a wrong try', () => {
    const { result } = renderHook(() => useGameScore())
    act(() => {
      result.current.miss('cat')
      result.current.miss('cat') // same item missed twice still costs one acierto
      result.current.miss('dog')
    })
    expect(result.current.result(5)).toEqual({ correct: 3, total: 5 })
  })

  it('is perfect when nothing was missed, and never goes negative', () => {
    const { result } = renderHook(() => useGameScore())
    expect(result.current.result(4)).toEqual({ correct: 4, total: 4 })
    act(() => {
      result.current.miss('a')
      result.current.miss('b')
    })
    expect(result.current.result(1)).toEqual({ correct: 0, total: 1 })
  })
})
