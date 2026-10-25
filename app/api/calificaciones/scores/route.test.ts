import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

const state = vi.hoisted(() => ({ authenticated: true }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success: true }) }))
vi.mock('@/lib/encryption', () => ({ decrypt: async (value: string) => value }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.authenticated ? { id: 'user-1' } : null } }),
    },
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        in: () =>
          table === 'richmond_assignments'
            ? Promise.resolve({
                data: [
                  {
                    id: 'assignment-1',
                    group_id: 'group-1',
                    title: 'Unit 1',
                    due_at: '2026-10-30',
                    total_students: 2,
                    total_submitted: 0,
                  },
                ],
              })
            : query,
        order: () =>
          table === 'groups'
            ? Promise.resolve({
                data: [{ id: 'group-1', name: 'K3 A', grade: 'Kinder 3', archived_at: null }],
              })
            : query,
        range: async () => ({
          data: [
            {
              assignment_id: 'assignment-1',
              student_id: 'student-1',
              richmond_student_id: 'r1',
              first_name_encrypted: 'Ana',
              last_name_encrypted: 'López',
              done: true,
              total_score: 80,
            },
            {
              assignment_id: 'assignment-1',
              student_id: 'student-2',
              richmond_student_id: 'r2',
              first_name_encrypted: 'Luis',
              last_name_encrypted: 'Pérez',
              done: false,
              total_score: null,
            },
          ],
        }),
      }
      return query
    },
  }),
}))

beforeEach(() => {
  state.authenticated = true
})

it('returns teacher-scoped grades with correct per-student completion totals', async () => {
  const response = await GET(
    new NextRequest('https://example.com/api/calificaciones/scores?group_id=all')
  )
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.assignments[0]).toMatchObject({ total_students: 2, total_submitted: 1 })
  expect(body.students).toHaveLength(2)
  expect(body.students.find((student: { id: string }) => student.id === 'student-1')).toMatchObject(
    {
      first: 'Ana',
      last: 'López',
      submitted: { 'assignment-1': true },
    }
  )
})

it('requires an authenticated teacher for grades', async () => {
  state.authenticated = false
  const response = await GET(
    new NextRequest('https://example.com/api/calificaciones/scores?group_id=all')
  )
  expect(response.status).toBe(401)
})
