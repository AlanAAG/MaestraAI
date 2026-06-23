// lib/richmond/map.ts
// Defensive mapping of Richmond's external API payload into our normalized shape.
// Richmond is a third-party API we don't control — field names are not contract-stable,
// so every field uses a fallback list rather than a fixed key. Never throw on shape.

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MappedStudent {
  rid: string
  first: string
  last: string
  progress: string
  score: number | null
  done: boolean
}

export interface MappedAssignment {
  id: string
  title: string
  instructions: string | null
  assigned_at: string | null
  due_at: string | null
  total_students: number
  total_submitted: number
  class_avg_score: number | null
  students: MappedStudent[]
}

export function pick(obj: any, keys: string[], fallback: unknown = undefined): unknown {
  for (const k of keys) if (obj?.[k] != null) return obj[k]
  return fallback
}

export function asStr(v: unknown, fallback = ''): string {
  return v == null ? fallback : String(v)
}

export function asNumOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export function mapStudent(s: any): MappedStudent {
  return {
    rid: asStr(pick(s, ['richmond_student_id', 'student_id', 'user_id', 'id'])),
    first: asStr(pick(s, ['first_name', 'firstname', 'name', 'first'])),
    last: asStr(pick(s, ['last_name', 'lastname', 'surname', 'last'])),
    progress: asStr(pick(s, ['progress', 'status', 'state'], 'not_started'), 'not_started'),
    score: asNumOrNull(pick(s, ['total_score', 'score', 'grade', 'points', 'result'])),
    done: Boolean(pick(s, ['done', 'submitted', 'is_submitted', 'completed'], false)),
  }
}

export function mapAssignment(a: any): MappedAssignment {
  const students = pick(a, ['students', 'scores', 'student_scores'], []) as unknown[]
  return {
    id: asStr(pick(a, ['id', 'richmond_id', 'uuid'])),
    title: asStr(pick(a, ['title', 'name'], 'Actividad'), 'Actividad'),
    instructions: (pick(a, ['instructions', 'description']) as string | null) ?? null,
    assigned_at: asStr(pick(a, ['assigned_at', 'assignedAt', 'start_date'])) || null,
    due_at: asStr(pick(a, ['due_at', 'dueAt', 'end_date'])) || null,
    total_students: asNumOrNull(pick(a, ['total_students', 'students_count'])) ?? 0,
    total_submitted: asNumOrNull(pick(a, ['total_submitted', 'submitted_count'])) ?? 0,
    class_avg_score: asNumOrNull(pick(a, ['class_avg_score', 'average_score', 'avg_score'])),
    students: Array.isArray(students) ? students.map(mapStudent) : [],
  }
}
