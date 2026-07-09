import { describe, it, expect } from 'vitest'
import { toFirstNames, displayFirstName, distributeObservations, OBS_DAYS } from './observation'

describe('toFirstNames', () => {
  it('strips to first name', () => {
    expect(toFirstNames(['Aitana Ruiz Olvera', 'Luis Fernando Dávila'])).toEqual(['Aitana', 'Luis'])
  })
  it('disambiguates duplicates with last initial', () => {
    expect(toFirstNames(['Regina Lopez', 'Regina Torres'])).toEqual(['Regina L.', 'Regina T.'])
  })
})

describe('displayFirstName', () => {
  it('first token only', () => {
    expect(displayFirstName('Maria Regina Lopez Huitron')).toBe('Maria')
    expect(displayFirstName('Regina')).toBe('Regina')
    expect(displayFirstName('')).toBe('')
  })
})

describe('distributeObservations', () => {
  it('assigns 2 per day cycling the week', () => {
    const names = Array.from({ length: 12 }, (_, i) => `Niño${i + 1}`)
    const cal = distributeObservations(names)
    expect(cal.lunes.slice(0, 2)).toEqual(['Niño1', 'Niño2'])
    expect(cal.viernes.slice(0, 2)).toEqual(['Niño9', 'Niño10'])
    // 11th & 12th wrap back to lunes
    expect(cal.lunes).toEqual(['Niño1', 'Niño2', 'Niño11', 'Niño12'])
    expect(OBS_DAYS.every((d) => cal[d].length >= 2)).toBe(true)
  })
})
