import { describe, it, expect } from 'vitest'
import { NEM_SYNTHESIS } from './synthesis'
import { EJES_FASE2 } from './grounding'

describe('NEM_SYNTHESIS', () => {
  it('contains all 7 canonical ejes', () => {
    for (const e of EJES_FASE2) expect(NEM_SYNTHESIS).toContain(e.nombre)
  })

  it('contains the perfil de egreso rasgos I–X and the core rule blocks', () => {
    expect(NEM_SYNTHESIS).toContain('I. Reconocen')
    expect(NEM_SYNTHESIS).toContain('X. Desarrollan el pensamiento crítico')
    for (const tag of [
      '<ejes_articuladores>',
      '<perfil_egreso_fase2>',
      '<campos_formativos>',
      '<evaluacion_reglas>',
      '<proni_regla>',
      '<privacidad>',
    ]) {
      expect(NEM_SYNTHESIS).toContain(tag)
    }
  })

  it('forbids numeric evaluation', () => {
    expect(NEM_SYNTHESIS).toContain('NUNCA numérica')
  })
})
