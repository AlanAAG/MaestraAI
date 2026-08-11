import { describe, it, expect } from 'vitest'
import { buildRegeneratePrompt, REGENERATE_SYSTEM } from './regenerate-section'

describe('buildRegeneratePrompt', () => {
  const args = {
    sectionKey: 'proyecto',
    currentText: '**Punto de Partida**\n- Actividad inicial.',
    comment: 'Muy corto, agrega más actividades con material concreto',
    projectName: 'Ya soy de Preprimaria',
    preferences: 'Prefiere frases operativas',
  }

  it('includes the current text, the comment and the project', () => {
    const p = buildRegeneratePrompt(args)
    expect(p).toContain('Punto de Partida')
    expect(p).toContain('agrega más actividades')
    expect(p).toContain('Ya soy de Preprimaria')
    expect(p).toContain('proyecto')
  })

  it('includes learned preferences only when present', () => {
    expect(buildRegeneratePrompt(args)).toContain('Prefiere frases operativas')
    expect(buildRegeneratePrompt({ ...args, preferences: '' })).not.toContain(
      '<preferencias_aprendidas>'
    )
  })

  it('system prompt demands ONLY the section text back', () => {
    expect(REGENERATE_SYSTEM).toContain('ÚNICAMENTE')
  })

  it('system prompt requires anonymous student labels to be preserved', () => {
    expect(REGENERATE_SYSTEM).toContain('Alumno A')
  })

  it('includes style samples only when present', () => {
    const withSamples = buildRegeneratePrompt({
      ...args,
      styleSamples: ['Fragmento de su voz.', 'Otro fragmento.'],
    })
    expect(withSamples).toContain('<voz_de_la_maestra>')
    expect(withSamples).toContain('Fragmento de su voz.')
    expect(buildRegeneratePrompt(args)).not.toContain('<voz_de_la_maestra>')
  })
})
