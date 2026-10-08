import { describe, expect, it } from 'vitest'
import { hasTemplateStructure, scrubTemplateText } from './extract-template'
import { templateContext } from './template-context'

describe('uploaded school format usability', () => {
  it('rejects voice-only or partial extraction instead of claiming the format is ready', () => {
    expect(hasTemplateStructure({ notes: 'Formato subido; extracción parcial' })).toBe(false)
    expect(hasTemplateStructure({ sections: ['Inicio', 'Proyecto'] })).toBe(true)
  })

  it('keeps school headings and the end of a long example while removing student names', () => {
    const profile = { sections: ['Actividades Iniciales', 'Evaluación Final'] }
    const text =
      'Actividades Iniciales\nRegina Martínez participó.\n' +
      'Actividad. '.repeat(3000) +
      '\nEvaluación Final\nREGLA AL FINAL'
    const clean = scrubTemplateText(text, profile)
    expect(clean).toContain('Actividades Iniciales')
    expect(clean).toContain('Evaluación Final')
    expect(clean).not.toContain('Regina Martínez')
    const context = templateContext({ ...profile, raw_text: clean })
    expect(context).toContain('REGLA AL FINAL')
    expect(context).toContain('banco oficial')
    expect(context).toContain('por encima de ejemplos históricos')
  })

  it('rejects malformed structure instead of trusting a truthy length', () => {
    expect(hasTemplateStructure({ sections: 'Proyecto' } as never)).toBe(false)
    expect(hasTemplateStructure({ sections: [''] })).toBe(false)
    expect(hasTemplateStructure({ subplan_inventory: [null] } as never)).toBe(false)
  })
})
