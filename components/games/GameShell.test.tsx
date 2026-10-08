import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { GameShell } from './GameShell'

vi.mock('@/hooks/useGameAudio', () => ({
  useGameAudio: () => ({ muted: true, play: vi.fn(), pause: vi.fn(), toggleMute: vi.fn() }),
}))
vi.mock('./FlashcardsGame', () => ({
  FlashcardsGame: ({
    onComplete,
  }: {
    onComplete: (r: { correct: number; total: number }) => void
  }) => (
    <button
      onClick={() => {
        onComplete({ correct: 2, total: 2 })
        onComplete({ correct: 2, total: 2 })
      }}
    >
      Terminar tarjetas
    </button>
  ),
}))
vi.mock('./GameComplete', () => ({
  GameComplete: ({ onReplay }: { onReplay: () => void }) => (
    <button onClick={onReplay}>Otra partida</button>
  ),
}))

it('reports a run only once even if completion fires twice, and counts a new replay separately', () => {
  const onResult = vi.fn()
  render(<GameShell type="flashcards" content={{}} vocabulary={[]} onResult={onResult} />)
  fireEvent.click(screen.getByText('Comenzar'))
  fireEvent.click(screen.getByText('Terminar tarjetas'))
  expect(onResult).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByText('Otra partida'))
  fireEvent.click(screen.getByText('Terminar tarjetas'))
  expect(onResult).toHaveBeenCalledTimes(2)
})
