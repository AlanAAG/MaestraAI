import { describe, it, expect } from 'vitest'
import { matchStudents } from '../csv-parser'

describe('CSV Parser', () => {
  describe('matchStudents', () => {
    it('should match students with exact names', () => {
      const parsed = [
        { name: 'Luis Fernando Dominguez', firstName: 'Luis', lastName: 'Fernando Dominguez' },
      ]

      const dbStudents = [
        {
          id: '1',
          first_name_encrypted: 'Luis',
          last_name_encrypted: 'Fernando Dominguez',
        },
      ]

      const result = matchStudents(parsed, dbStudents)

      expect(result[0].matchedStudentId).toBe('1')
      expect(result[0].matchConfidence).toBeGreaterThan(0.9)
    })

    it('should match students with similar names using fuzzy matching', () => {
      const parsed = [{ name: 'Luis F Dominguez', firstName: 'Luis', lastName: 'F Dominguez' }]

      const dbStudents = [
        {
          id: '1',
          first_name_encrypted: 'Luis',
          last_name_encrypted: 'Fernando Dominguez',
        },
      ]

      const result = matchStudents(parsed, dbStudents)

      expect(result[0].matchedStudentId).toBe('1')
      expect(result[0].matchConfidence).toBeGreaterThan(0.6)
    })

    it('should not match students with very different names', () => {
      const parsed = [{ name: 'Maria Garcia', firstName: 'Maria', lastName: 'Garcia' }]

      const dbStudents = [
        {
          id: '1',
          first_name_encrypted: 'Luis',
          last_name_encrypted: 'Fernando Dominguez',
        },
      ]

      const result = matchStudents(parsed, dbStudents)

      expect(result[0].matchedStudentId).toBeUndefined()
    })

    it('should match by first name even if last name differs', () => {
      const parsed = [{ name: 'Sofia Martinez', firstName: 'Sofia', lastName: 'Martinez' }]

      const dbStudents = [
        {
          id: '1',
          first_name_encrypted: 'Sofia',
          last_name_encrypted: 'Martinez Lopez',
        },
      ]

      const result = matchStudents(parsed, dbStudents)

      expect(result[0].matchedStudentId).toBe('1')
      expect(result[0].matchConfidence).toBeGreaterThan(0.6)
    })
  })
})
