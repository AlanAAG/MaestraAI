import { describe, it, expect } from 'vitest'
import { parseClaudeResponse } from './parse-response'

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

describe('parseClaudeResponse', () => {
  it('parses a valid 10-element JSON array and assigns correct dates', () => {
    const input = JSON.stringify(makeDayArray())
    const plans = parseClaudeResponse(input, MONDAY)

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
    const plans = parseClaudeResponse(fenced, MONDAY)
    expect(plans).toHaveLength(10)
    expect(plans[0].methodology).toBe('play_based')
  })

  it('unwraps GPT-4o-mini {"days":[...]} envelope', () => {
    const wrapped = JSON.stringify({ days: makeDayArray() })
    const plans = parseClaudeResponse(wrapped, MONDAY)
    expect(plans).toHaveLength(10)
    expect(plans[0].day_of_week).toBe('lunes')
    expect(plans[5].date).toBe('2026-06-23')
  })

  it('throws when response is an object without a days key (regression: Array.isArray guard)', () => {
    const input = JSON.stringify({ day_number: 1, methodology: 'play_based' })
    expect(() => parseClaudeResponse(input, MONDAY)).toThrow('Claude response is not a JSON array')
  })

  it('fills missing days with empty defaults when array is shorter than 10', () => {
    const input = JSON.stringify(makeDayArray(3))
    const plans = parseClaudeResponse(input, MONDAY)
    expect(plans).toHaveLength(10)
    expect(plans[3].blocks).toEqual([])
    expect(plans[3].vocabulary).toEqual([])
    expect(plans[3].methodology).toBe('project_based')
  })

  it('throws on malformed JSON', () => {
    expect(() => parseClaudeResponse('{ not json at all }', MONDAY)).toThrow(
      'Failed to parse Claude response'
    )
  })
})
