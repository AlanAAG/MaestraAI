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

describe('safeFileName', () => {
  it('strips path tricks and keeps readable names', () => {
    expect(safeFileName('../../etc/passwd')).toBe('.._.._etc_passwd')
    expect(safeFileName('Tarea de Niño (final).pdf')).toBe('Tarea de Niño final.pdf')
    expect(safeFileName('///')).toBe('___')
  })
})
