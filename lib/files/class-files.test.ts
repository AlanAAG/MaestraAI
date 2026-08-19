import { describe, it, expect } from 'vitest'
import { parseFilePath, safeFileName } from './class-files'

describe('parseFilePath (file ACL scopes)', () => {
  it('parses post and submission paths', () => {
    expect(parseFilePath('g/gid1/abc-tarea.pdf')).toEqual({ kind: 'post', groupId: 'gid1' })
    expect(parseFilePath('s/post1/stu1/abc-foto.jpg')).toEqual({
      kind: 'submission',
      postId: 'post1',
      studentId: 'stu1',
    })
  })
  it('denies anything else', () => {
    expect(parseFilePath('g/gid1/deep/extra.pdf')).toBeNull()
    expect(parseFilePath('x/whatever.pdf')).toBeNull()
    expect(parseFilePath('')).toBeNull()
  })
})

describe('safeFileName (Storage-safe keys)', () => {
  it('transliterates accents and spaces — Supabase rejects non-ASCII keys', () => {
    // The exact filename that produced InvalidKey in prod:
    expect(safeFileName('Actividades Diagnóstico.pdf')).toBe('Actividades_Diagnostico.pdf')
    expect(safeFileName('Tarea de Niño (final).pdf')).toBe('Tarea_de_Nino_final.pdf')
  })
  it('strips path tricks and always returns a usable key', () => {
    expect(safeFileName('../../etc/passwd')).toBe('etc_passwd')
    expect(safeFileName('///')).toBe('archivo')
    expect(safeFileName('日本語')).toBe('archivo')
  })
  it('only emits Storage-legal characters', () => {
    for (const name of ['Reglamento 2026 ¡NUEVO!.pdf', 'ñandú & cía.docx', 'a b c.png']) {
      expect(safeFileName(name)).toMatch(/^[A-Za-z0-9._-]+$/)
    }
  })
})
