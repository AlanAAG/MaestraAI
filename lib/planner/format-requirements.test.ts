import { expect, it } from 'vitest'
import { mainHeadings, mainHeadingsBlock } from './format-requirements'
import { METHODOLOGY_STRUCTURE } from './methodologies'

const profile = {
  formatting_rules: {
    proyecto_subheadings: ['Presentación e inicio', 'Desarrollo', 'Producto final'],
  },
}
it('keeps uploaded headings when the methodology was automatic, even after a default is chosen', () => {
  expect(mainHeadings('Automático', profile, 'Centro de Interés')).toEqual(
    profile.formatting_rules.proyecto_subheadings
  )
  expect(mainHeadingsBlock(mainHeadings('', profile))).toContain('**Producto final**')
})
it('honors an explicitly selected methodology and otherwise uses the correct workshop default', () => {
  expect(mainHeadings('Taller Crítico', profile)).toEqual(
    METHODOLOGY_STRUCTURE['Taller Crítico'].map((m) => m.label)
  )
  expect(mainHeadings(null, null, 'Taller Crítico')).toEqual(
    METHODOLOGY_STRUCTURE['Taller Crítico'].map((m) => m.label)
  )
})
