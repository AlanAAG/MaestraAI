import { describe, it, expect } from 'vitest'
import {
  buildPlanContext,
  trimTurns,
  CHAT_EDITABLE_SECTIONS,
  CHAT_SYSTEM,
  EDIT_TOOL,
  type ChatTurn,
} from './chat'

describe('CHAT_EDITABLE_SECTIONS', () => {
  it('covers the narrative sections', () => {
    expect(CHAT_EDITABLE_SECTIONS.has('proyecto')).toBe(true)
    expect(CHAT_EDITABLE_SECTIONS.has('pausas_activas')).toBe(true)
    expect(CHAT_EDITABLE_SECTIONS.has('nombre_proyecto')).toBe(true)
  })

  it('excludes code-enforced fields — the model must not be able to rewrite them', () => {
    // These are snapped to the official contenidos bank / built structurally.
    for (const key of ['campos_formativos', 'cronograma', 'evaluacion_items', 'sub_planes']) {
      expect(CHAT_EDITABLE_SECTIONS.has(key)).toBe(false)
    }
  })

  it('the tool enum matches the allowlist, so the model cannot name a forbidden section', () => {
    const enumValues = EDIT_TOOL.input_schema.properties.seccion.enum as readonly string[]
    expect([...enumValues].sort()).toEqual(Array.from(CHAT_EDITABLE_SECTIONS).sort())
  })
})

describe('CHAT_SYSTEM', () => {
  it('carries the non-negotiable constraints', () => {
    expect(CHAT_SYSTEM).toMatch(/NUNCA inventes ni menciones Contenidos o PDA/)
    expect(CHAT_SYSTEM).toMatch(/NUNCA uses calificaciones numéricas/)
    expect(CHAT_SYSTEM).toMatch(/NUNCA escribas nombres reales/)
  })
})

describe('buildPlanContext', () => {
  const doc = {
    nombre_proyecto: 'Los animales',
    proyecto: 'Vamos a explorar el zoológico.',
    pausas_activas: 'Bailamos la canción de los animales.',
    metodologia: 'Taller Crítico',
    campos_formativos: [{ campo: 'Lenguajes' }, { campo: 'Saberes y Pensamiento Científico' }],
    sub_planes: [{ tipo: 'letter_number' }],
  }

  it('includes editable sections with their keys', () => {
    const ctx = buildPlanContext(doc)
    expect(ctx).toContain('clave="proyecto"')
    expect(ctx).toContain('Vamos a explorar el zoológico.')
    expect(ctx).toContain('clave="pausas_activas"')
  })

  it('surfaces enforced fields as read-only context, not as editable sections', () => {
    const ctx = buildPlanContext(doc)
    expect(ctx).toContain('Campos formativos (fijados, no editables)')
    expect(ctx).toContain('Lenguajes')
    expect(ctx).not.toContain('clave="campos_formativos"')
  })

  it('skips empty and non-string sections', () => {
    const ctx = buildPlanContext({ proyecto: '   ', aventura_lectora: 42, pausas_activas: 'ok' })
    expect(ctx).not.toContain('clave="proyecto"')
    expect(ctx).not.toContain('clave="aventura_lectora"')
    expect(ctx).toContain('clave="pausas_activas"')
  })

  it('truncates a very long section instead of sending the whole thing', () => {
    const ctx = buildPlanContext({ proyecto: 'x'.repeat(9000) })
    expect(ctx).toContain('[…recortado…]')
    expect(ctx.length).toBeLessThan(9000)
  })

  it('handles a document with no narrative sections', () => {
    expect(buildPlanContext({})).toContain('aún no tiene secciones narrativas')
  })
})

describe('trimTurns', () => {
  it('keeps the most recent turns, dropping the oldest', () => {
    const turns: ChatTurn[] = Array.from({ length: 30 }, (_, i) => ({
      role: 'user' as const,
      content: String(i),
    }))
    const kept = trimTurns(turns, 5)
    expect(kept).toHaveLength(5)
    expect(kept[0].content).toBe('25')
    expect(kept[4].content).toBe('29')
  })

  it('leaves a short conversation untouched', () => {
    const turns: ChatTurn[] = [{ role: 'user', content: 'hola' }]
    expect(trimTurns(turns)).toEqual(turns)
  })
})
