import { describe, it, expect } from 'vitest'
import { parsePlanResponse } from './parse-response'

// Monday 2026-06-16 is a safe Monday start date for date arithmetic tests
const MONDAY = '2026-06-16'

function makeDay(i: number) {
  return {
    day_number: i + 1,
    methodology: 'play_based',
    blocks: [{ time: '9:00', activity: `Activity ${i}` }],
    vocabulary: ['cat', 'dog'],
    observation_students: [],
    nee_reminders: [],
  }
}

function makeDayArray(count = 10) {
  return Array.from({ length: count }, (_, i) => makeDay(i))
}

describe('parsePlanResponse', () => {
  it('parses a valid 10-element JSON array and assigns correct dates', () => {
    const input = JSON.stringify(makeDayArray())
    const plans = parsePlanResponse(input, MONDAY)

    expect(plans).toHaveLength(10)
    expect(plans[0].day_number).toBe(1)
    expect(plans[0].day_of_week).toBe('lunes')
    expect(plans[0].date).toBe('2026-06-16')
    expect(plans[4].day_of_week).toBe('viernes')
    expect(plans[4].date).toBe('2026-06-20')
    // days 6-10 must skip the weekend (sat 21, sun 22)
    expect(plans[5].day_of_week).toBe('lunes')
    expect(plans[5].date).toBe('2026-06-23')
    expect(plans[9].date).toBe('2026-06-27')
  })

  it('parses JSON wrapped in markdown code fences', () => {
    const inner = JSON.stringify(makeDayArray())
    const fenced = `\`\`\`json\n${inner}\n\`\`\``
    const plans = parsePlanResponse(fenced, MONDAY)
    expect(plans).toHaveLength(10)
    expect(plans[0].methodology).toBe('play_based')
  })

  it('unwraps plan {"days":[...]} envelope', () => {
    const wrapped = JSON.stringify({ days: makeDayArray() })
    const plans = parsePlanResponse(wrapped, MONDAY)
    expect(plans).toHaveLength(10)
    expect(plans[0].day_of_week).toBe('lunes')
    expect(plans[5].date).toBe('2026-06-23')
  })

  it('throws when response is an object without a days key (regression: Array.isArray guard)', () => {
    const input = JSON.stringify({ day_number: 1, methodology: 'play_based' })
    expect(() => parsePlanResponse(input, MONDAY)).toThrow('Plan response is not a JSON array')
  })

  it('rejects missing days so generation can retry with the stronger model', () => {
    const input = JSON.stringify(makeDayArray(3))
    expect(() => parsePlanResponse(input, MONDAY)).toThrow('10 días')
  })

  it('rejects empty days instead of saving a hollow plan', () => {
    const days = makeDayArray()
    days[4].blocks = []
    expect(() => parsePlanResponse(JSON.stringify(days), MONDAY)).toThrow('sin actividades')
  })

  it('throws on malformed JSON', () => {
    expect(() => parsePlanResponse('{ not json at all }', MONDAY)).toThrow(
      'Failed to parse plan response'
    )
  })
})
