import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  additionalUnits,
  generateSubplan,
  generateCustomSubplan,
  missingSubplanFields,
} from './subplan'
import { CONTENIDOS_FASE2_3 } from '@/lib/nem/contenidos-fase2'

const model = vi.hoisted(() => vi.fn())
vi.mock('./model', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./model')>()),
  callPlannerJson: model,
}))
const activity =
  '- Presentaré las tarjetas y pediré a cada niño que las relacione con los objetos del salón. Compartiremos lo que observamos.'
const full = {
  nombre: 'Exploramos las letras',
  estructura_didactica: { momento_1: activity, momento_2: activity, momento_3: activity },
  evaluacion: Array.from({ length: 4 }, (_, i) => ({
    aspecto: `Reconoce las letras y explica su elección ${i}`,
  })),
  campos_formativos: [
    {
      campo: CONTENIDOS_FASE2_3[0].campo,
      contenidos: [{ contenido: CONTENIDOS_FASE2_3[0].contenido, procesos: [] }],
    },
  ],
}
beforeEach(() => vi.clearAllMocks())

describe('complete sub-plans and requested units', () => {
  it('preserves the unit’s teacher-selected content and cross-grade PDA even if the model invents a table', async () => {
    const row = CONTENIDOS_FASE2_3[0]
    model.mockResolvedValueOnce({
      ...full,
      campos_formativos: [{ campo: 'Inventado', contenidos: [] }],
    })
    const result = await generateCustomSubplan(
      { project_name: 'Historias', _grade: 'Kinder 3' },
      {
        methodology: 'Centro de Interés',
        name: 'Historias',
        contenidos: [row.contenido],
        procesos: { [row.contenido]: [row.pdas1[0]] },
      }
    )
    expect(result.campos_formativos).toEqual([
      { campo: row.campo, contenidos: [{ contenido: row.contenido, procesos: [row.pdas1[0]] }] },
    ])
    expect(model.mock.calls[0][1]).toContain(row.pdas1[0])
  })
  it('does not mistake one long teaching stage for a complete sub-plan', () => {
    expect(
      missingSubplanFields({ ...full, estructura_didactica: { momento_1: activity.repeat(20) } }, [
        'momento_1',
        'momento_2',
        'momento_3',
      ])
    ).toEqual(['estructura_didactica'])
  })

  it('repairs missing stages, retains evaluation, and assigns the expected sub-plan type', async () => {
    model.mockResolvedValueOnce({
      ...full,
      tipo: 'wrong',
      estructura_didactica: { momento_1: activity },
    })
    model.mockResolvedValueOnce({ estructura_didactica: full.estructura_didactica, evaluacion: [] })
    const result = await generateSubplan(
      { project_name: 'Mi familia', _grade: 'Kinder 3' },
      'letter_number',
      {
        vocabList: '',
        letterDay: 'martes',
        numDay: 'jueves',
        includeProni: true,
      }
    )
    expect(result.tipo).toBe('letter_number')
    expect(result.evaluacion).toHaveLength(4)
    expect(Object.keys(result.estructura_didactica as object)).toHaveLength(3)
    expect(model.mock.calls[1][0]).toContain('SOLO estas claves JSON: estructura_didactica.')
  })

  it('keeps all explicit additional units, including repeated methodologies and more than three units', () => {
    const units = [
      { metodologia: 'Proyecto', nombre: 'Principal' },
      { metodologia: 'Centro de Interés', nombre: 'Flores' },
      { metodologia: 'Proyecto', nombre: 'Familias' },
      { metodologia: 'Taller Crítico', nombre: 'Pintura' },
      { metodologia: 'Asamblea', nombre: 'Acuerdos' },
    ]
    expect(additionalUnits(units)).toEqual(units.slice(1))
  })

  it('only excludes the main project and named Letters/Números from a template inventory', () => {
    const flowerUnit = { metodologia: 'Centro de Interés', nombre: 'Flores' }
    expect(
      additionalUnits(null, [
        { metodologia: 'Proyecto', nombre: 'Principal' },
        { metodologia: 'Centro de Interés', nombre: 'Letters' },
        { metodologia: 'Centro de Interés', nombre: 'Números' },
        flowerUnit,
      ])
    ).toEqual([flowerUnit])
  })
})
