import { describe, it, expect } from 'vitest'
import { mapSectionName, buildSectionMeta, DEFAULT_QUINCENA_ORDER } from './section-map'

describe('mapSectionName', () => {
  it('maps exact canonical names', () => {
    expect(mapSectionName('Actividades Iniciales')).toBe('actividades_iniciales')
    expect(mapSectionName('Aventura Lectora')).toBe('aventura_lectora')
    expect(mapSectionName('Ajustes Razonables')).toBe('ajustes_razonables')
    expect(mapSectionName('Del Proyecto')).toBe('proyecto')
    expect(mapSectionName('Evaluación de Aprendizajes')).toBe('evaluacion_items')
    expect(mapSectionName('Cronograma')).toBe('cronograma')
  })

  it('maps accented variants', () => {
    expect(mapSectionName('Evaluación')).toBe('evaluacion_items')
    expect(mapSectionName('Estrategia Comunitaria')).toBe('estrategia_comunitaria')
    expect(mapSectionName('Actividades de Rutina y Permanentes')).toBe('actividades_rutina')
  })

  it('maps alternative teacher names via alias tokens', () => {
    expect(mapSectionName('Apertura')).toBe('actividades_iniciales')
    expect(mapSectionName('Rutinas Permanentes')).toBe('actividades_rutina')
    expect(mapSectionName('Fichero de la Paz')).toBe('estrategia_comunitaria')
    expect(mapSectionName('Momentos Pedagógicos')).toBe('proyecto')
    expect(mapSectionName('Necesidades Educativas Especiales')).toBe('ajustes_razonables')
    expect(mapSectionName('Pausa Activa')).toBe('pausas_activas')
    expect(mapSectionName('Lista de Cotejo')).toBe('evaluacion_items')
  })

  it('is case and accent insensitive', () => {
    expect(mapSectionName('ACTIVIDADES INICIALES')).toBe('actividades_iniciales')
    expect(mapSectionName('Éjes Articuladores')).toBe('ejes_articuladores')
    expect(mapSectionName('aventura lectora')).toBe('aventura_lectora')
  })

  it('returns null for unknown sections', () => {
    expect(mapSectionName('Bienvenida a la Escuela ABC')).toBe('actividades_iniciales') // 'bienvenida' alias
    expect(mapSectionName('Cartelera Semanal')).toBeNull()
    expect(mapSectionName('Firma de la Directora')).toBeNull()
    expect(mapSectionName('')).toBeNull()
  })
})

describe('buildSectionMeta', () => {
  it('returns empty arrays for empty input', () => {
    const { sectionOrder, sectionTitles, customSectionNames } = buildSectionMeta([])
    expect(sectionOrder).toEqual([])
    expect(sectionTitles).toEqual({})
    expect(customSectionNames).toEqual([])
  })

  it('maps a typical teacher section list in order', () => {
    const sections = [
      'Actividades Iniciales',
      'Rutinas Permanentes',
      'Aventura Lectora',
      'Estrategia Comunitaria',
      'Del Proyecto',
      'Evaluación de Aprendizajes',
    ]
    const { sectionOrder, sectionTitles } = buildSectionMeta(sections)
    expect(sectionOrder).toEqual([
      'actividades_iniciales',
      'actividades_rutina',
      'aventura_lectora',
      'estrategia_comunitaria',
      'proyecto',
      'evaluacion_items',
    ])
    // Stores the teacher's exact title for each key
    expect(sectionTitles['actividades_rutina']).toBe('Rutinas Permanentes')
    expect(sectionTitles['proyecto']).toBe('Del Proyecto')
  })

  it('puts unmapped sections in custom_sections and adds custom:N keys to order', () => {
    const { sectionOrder, customSectionNames } = buildSectionMeta([
      'Actividades Iniciales',
      'Cartelera Semanal', // unmapped
      'Del Proyecto',
      'Firma Directora', // unmapped
    ])
    expect(sectionOrder).toEqual(['actividades_iniciales', 'custom:0', 'proyecto', 'custom:1'])
    expect(customSectionNames).toEqual(['Cartelera Semanal', 'Firma Directora'])
  })

  it('deduplicates sections that map to the same key (first wins)', () => {
    // "Apertura" and "Actividades Iniciales" both map to actividades_iniciales
    const { sectionOrder, sectionTitles } = buildSectionMeta([
      'Apertura',
      'Del Proyecto',
      'Actividades Iniciales', // duplicate key — should be dropped
    ])
    expect(sectionOrder.filter((k) => k === 'actividades_iniciales')).toHaveLength(1)
    expect(sectionTitles['actividades_iniciales']).toBe('Apertura') // first wins
  })

  it('handles all-custom sections list', () => {
    const { sectionOrder, customSectionNames } = buildSectionMeta(['Sección A', 'Sección B'])
    expect(sectionOrder).toEqual(['custom:0', 'custom:1'])
    expect(customSectionNames).toEqual(['Sección A', 'Sección B'])
  })

  it('DEFAULT_QUINCENA_ORDER covers every standard field', () => {
    const stdFields = [
      'actividades_iniciales',
      'actividades_rutina',
      'aventura_lectora',
      'estrategia_comunitaria',
      'pausas_activas',
      'ajustes_razonables',
      'cronograma',
      'ejes_articuladores',
      'campos_formativos',
      'proyecto',
      'evaluacion_items',
    ]
    for (const f of stdFields) {
      expect(DEFAULT_QUINCENA_ORDER).toContain(f)
    }
  })
})
