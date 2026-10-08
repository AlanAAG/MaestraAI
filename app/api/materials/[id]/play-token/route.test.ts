import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

const state = vi.hoisted(() => ({ token: null as string | null, own: true }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success: true }) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
    from: (table: string) => {
      let proposed = '',
        nullOnly = false
      const query = {
        select: () => query,
        eq: () => query,
        is: () => {
          nullOnly = true
          return query
        },
        update: (data: { play_token: string }) => {
          proposed = data.play_token
          return query
        },
        single: async () => ({
          data:
            table === 'teachers'
              ? { id: 'teacher' }
              : state.own
                ? { id: 'material', type: 'memory_game', play_token: state.token }
                : null,
        }),
        maybeSingle: async () => {
          if (nullOnly && state.token) return { data: null, error: null }
          state.token = proposed
          return { data: { play_token: state.token }, error: null }
        },
      }
      return query
    },
  }),
}))
const request = () =>
  new NextRequest('https://example.com/api/materials/material/play-token', { method: 'POST' })
beforeEach(() => {
  state.token = null
  state.own = true
})
it('returns the same permanent link for concurrent share requests', async () => {
  const responses = await Promise.all([
    POST(request(), { params: { id: 'material' } }),
    POST(request(), { params: { id: 'material' } }),
  ])
  const [a, b] = await Promise.all(responses.map((r) => r.json()))
  expect(a.play_token).toMatch(/^[a-f0-9]{32}$/)
  expect(a.play_token).toBe(b.play_token)
  expect(a.play_url).toBe(b.play_url)
  expect(state.token).toBe(a.play_token)
})
it('cannot create a share link for someone else’s material', async () => {
  state.own = false
  expect((await POST(request(), { params: { id: 'material' } })).status).toBe(404)
  expect(state.token).toBeNull()
})
