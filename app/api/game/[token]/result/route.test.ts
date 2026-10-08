import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

const state = vi.hoisted(() => ({
  playerTeacher: 'teacher-a',
  rows: new Map<string, Record<string, unknown>>(),
  insertError: false,
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success: true }) }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      let id = ''
      const query = {
        select: () => query,
        eq: (key: string, value: string) => {
          if (key === 'id') id = value
          return query
        },
        single: async () => ({
          data:
            table === 'materials'
              ? { id: 'material', teacher_id: 'teacher-a', homework_min_correct: 2 }
              : table === 'game_players'
                ? { id, teacher_id: state.playerTeacher }
                : (state.rows.get(id) ?? null),
        }),
        insert: async (row: Record<string, unknown>) => {
          if (state.insertError) return { error: { code: 'offline' } }
          if (state.rows.has(String(row.id))) return { error: { code: '23505' } }
          state.rows.set(String(row.id), row)
          return { error: null }
        },
        update: () => query,
      }
      return query
    },
  }),
}))
const token = 'a'.repeat(32)
const body = {
  attempt_id: '11111111-1111-4111-8111-111111111111',
  player_id: '22222222-2222-4222-8222-222222222222',
  correct: 2,
  total: 3,
  duration_s: 10,
}
const request = (data = body) =>
  new NextRequest(`https://example.com/api/game/${token}/result`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
beforeEach(() => {
  state.rows.clear()
  state.playerTeacher = 'teacher-a'
  state.insertError = false
})

describe('public homework result saving', () => {
  it('accepts an anonymous attempt and counts a lost-response retry only once', async () => {
    const first = await POST(request(), { params: { token } })
    const retry = await POST(request(), { params: { token } })
    expect(first.status).toBe(200)
    expect(await retry.json()).toMatchObject({ saved: true, passed: true })
    expect(state.rows.size).toBe(1)
  })
  it('rejects another teacher’s profile before writing', async () => {
    state.playerTeacher = 'teacher-b'
    expect((await POST(request(), { params: { token } })).status).toBe(403)
    expect(state.rows.size).toBe(0)
  })
  it('does not overwrite a prior attempt with different results', async () => {
    await POST(request(), { params: { token } })
    expect((await POST(request({ ...body, correct: 1 }), { params: { token } })).status).toBe(409)
    expect(state.rows.get(body.attempt_id)?.correct).toBe(2)
  })
  it('does not claim that an unsuccessful database write was saved', async () => {
    state.insertError = true
    expect((await POST(request(), { params: { token } })).status).toBe(500)
    expect(state.rows.size).toBe(0)
  })
  it('rejects impossible scores and malformed links', async () => {
    expect((await POST(request({ ...body, correct: 4 }), { params: { token } })).status).toBe(400)
    expect((await POST(request(), { params: { token: 'invalid' } })).status).toBe(404)
    expect(state.rows.size).toBe(0)
  })
})
