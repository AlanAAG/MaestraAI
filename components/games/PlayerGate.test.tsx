import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PlayerGate } from './PlayerGate'

vi.mock('@/components/games/GameShell', () => ({
  GameShell: ({
    onResult,
  }: {
    onResult?: (r: { correct: number; total: number; durationS: number }) => void
  }) => (
    <button onClick={() => onResult?.({ correct: 2, total: 3, durationS: 9 })}>
      Terminar juego
    </button>
  ),
}))

const content = {}
const player = {
  id: 'c7223cbb-0c9a-4801-9454-20705bb09991',
  nickname: 'Luna',
  avatar: '🐱',
  code: 'ABC234',
}

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  })
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

describe('anonymous game profiles', () => {
  it('keeps a different teacher’s player out of this game', async () => {
    localStorage.setItem('maestraia_player:teacher-a', JSON.stringify(player))
    render(
      <PlayerGate
        teacherId="teacher-b"
        token="token"
        type="matching"
        content={content}
        vocabulary={[]}
      />
    )
    expect(await screen.findByText('¿Quién va a jugar?')).toBeTruthy()
  })

  it('lets a shared device change players', async () => {
    localStorage.setItem('maestraia_player:teacher-a', JSON.stringify(player))
    render(
      <PlayerGate
        teacherId="teacher-a"
        token="token"
        type="matching"
        content={content}
        vocabulary={[]}
      />
    )
    expect(await screen.findByText('Luna')).toBeTruthy()
    fireEvent.click(screen.getByText('Cambiar jugador'))
    expect(screen.getByText('¿Quién va a jugar?')).toBeTruthy()
    expect(localStorage.getItem('maestraia_player:teacher-a')).toBeNull()
  })

  it('offers a retry when saving a completed result fails', async () => {
    localStorage.setItem('maestraia_player:teacher-a', JSON.stringify(player))
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({ ok: false } as Response)
    fetchMock.mockResolvedValueOnce({ ok: true } as Response)
    render(
      <PlayerGate
        teacherId="teacher-a"
        token="token"
        type="matching"
        content={content}
        vocabulary={[]}
      />
    )
    fireEvent.click(await screen.findByText('Terminar juego'))
    expect(await screen.findByText('Reintentar')).toBeTruthy()
    fireEvent.click(screen.getByText('Reintentar'))
    await waitFor(() => expect(screen.getByText(/Avance guardado/)).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    const retry = JSON.parse(String(fetchMock.mock.calls[1][1]?.body))
    expect(first.attempt_id).toBeTruthy()
    expect(retry.attempt_id).toBe(first.attempt_id)
    expect(localStorage.getItem('maestraia_results:teacher-a:token')).toBeNull()
  })

  it('saves a queued result after reloading without requiring a login or replay', async () => {
    localStorage.setItem('maestraia_player:teacher-a', JSON.stringify(player))
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({ ok: false } as Response)
    const props = {
      teacherId: 'teacher-a',
      token: 'token',
      type: 'matching',
      content,
      vocabulary: [],
    }
    const view = render(<PlayerGate {...props} />)
    fireEvent.click(await screen.findByText('Terminar juego'))
    await screen.findByText('Reintentar')
    const queued = JSON.parse(localStorage.getItem('maestraia_results:teacher-a:token')!)[0]
    view.unmount()
    fetchMock.mockResolvedValueOnce({ ok: true } as Response)
    render(<PlayerGate {...props} />)
    await screen.findByText(/Avance guardado/)
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).attempt_id).toBe(queued.attemptId)
    expect(localStorage.getItem('maestraia_results:teacher-a:token')).toBeNull()
  })
})
