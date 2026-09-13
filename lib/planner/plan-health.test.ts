import { describe, it, expect } from 'vitest'
import { checkPlanHealth, type HealthIssue } from './plan-health'

const momentos = ['**Punto de Partida**', ...Array(9).fill('- actividad')].join('\n')

const goodSub = (tipo: string) => ({
  tipo,
  nombre: 'Sub',
  estructura_didactica: { inicio: 'x'.repeat(120) },
})

function plan(over: Record<string, unknown> = {}) {
  return {
    tipo: 'quincena',
    proyecto: momentos,
    ajustes_razonables:
      ['## 1', '## 2', '## 3', '## 4', '## 5'].join('\n') + '\n' + 'x'.repeat(100),
    actividades_iniciales: 'x'.repeat(100),
    actividades_rutina: 'x'.repeat(100),
    estrategia_comunitaria: 'Ficha número 1 "A". Ficha número 2 "B".',
    cronograma: Object.fromEntries(
      ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].map((d) => [d, ['a', 'b', 'c', 'd']])
    ),
    campos_formativos: [{ campo: 'Lenguajes', contenidos: [{ contenido: 'C', procesos: [] }] }],
    evaluacion_items: [{ aspecto: 'a' }, { aspecto: 'b' }, { aspecto: 'c' }],
    sub_planes: [goodSub('letter_number'), goodSub('numeros')],
    ...over,
  }
}

const errs = (i: HealthIssue[]) => i.filter((x) => x.severity === 'error')

describe('checkPlanHealth — sub-plans', () => {
  it('is quiet on a complete quincena', () => {
    const issues = checkPlanHealth(plan(), { planType: 'quincena', fichaNumbers: [1, 2] })
    expect(errs(issues)).toEqual([])
  })

  it('raises an ERROR when a sub-plan never arrived', () => {
    const issues = checkPlanHealth(plan({ sub_planes: [goodSub('letter_number')] }), {
      planType: 'quincena',
      fichaNumbers: [1, 2],
    })
    const e = errs(issues)
    expect(e).toHaveLength(1)
    expect(e[0].section).toBe('Números')
    expect(e[0].issue).toMatch(/no se generó/)
  })

  it('raises an ERROR when a sub-plan came back as a stub', () => {
    const issues = checkPlanHealth(
      plan({
        sub_planes: [goodSub('letter_number'), { tipo: 'numeros', estructura_didactica: {} }],
      }),
      { planType: 'quincena', fichaNumbers: [1, 2] }
    )
    expect(errs(issues)[0].issue).toMatch(/vacía/)
  })

  it('treats a missing sub_planes array as both missing', () => {
    const issues = checkPlanHealth(plan({ sub_planes: undefined }), { planType: 'quincena' })
    expect(errs(issues)).toHaveLength(2)
  })

  it('does not expect sub-plans from a taller', () => {
    const issues = checkPlanHealth(
      {
        tipo: 'taller',
        desarrollo_taller: momentos,
        ajustes_razonables: 'x'.repeat(100),
        actividades_iniciales: 'x'.repeat(100),
      },
      { planType: 'taller' }
    )
    expect(errs(issues)).toEqual([])
  })
})

describe('checkPlanHealth — weekly fichas', () => {
  it('flags a plan that cites none of its assigned fichas', () => {
    const issues = checkPlanHealth(plan({ estrategia_comunitaria: 'sin ficha' }), {
      planType: 'quincena',
      fichaNumbers: [7, 8],
    })
    expect(issues.some((i) => i.issue.includes('no cita la ficha'))).toBe(true)
  })

  it('flags the weekly rotation collapsing back into one activity', () => {
    const issues = checkPlanHealth(
      plan({ estrategia_comunitaria: 'Ficha número 7 "A" y nada más' }),
      { planType: 'quincena', fichaNumbers: [7, 8] }
    )
    expect(issues.some((i) => i.issue.includes('falta la actividad de la ficha 8'))).toBe(true)
  })

  it('says nothing when no fichas were assigned', () => {
    const issues = checkPlanHealth(plan({ estrategia_comunitaria: '' }), { planType: 'quincena' })
    expect(issues.some((i) => i.issue.includes('ficha'))).toBe(false)
  })
})

describe('checkPlanHealth — Richmond', () => {
  it('flags a picked unit the document never cites', () => {
    const issues = checkPlanHealth(plan(), {
      planType: 'quincena',
      fichaNumbers: [1, 2],
      richmondSelected: true,
    })
    expect(issues.some((i) => i.issue.includes('no cita el libro'))).toBe(true)
  })

  it('is satisfied by a Student Book citation', () => {
    const issues = checkPlanHealth(
      plan({ proyecto: `${momentos}\n- STUDENT BOOK páginas 10 a 15` }),
      {
        planType: 'quincena',
        fichaNumbers: [1, 2],
        richmondSelected: true,
      }
    )
    expect(issues.some((i) => i.issue.includes('no cita el libro'))).toBe(false)
  })

  it('stays quiet when no unit was picked', () => {
    const issues = checkPlanHealth(plan(), { planType: 'quincena', fichaNumbers: [1, 2] })
    expect(issues.some((i) => i.issue.includes('no cita el libro'))).toBe(false)
  })
})

describe('checkPlanHealth — degenerate input', () => {
  it('never throws on garbage', () => {
    for (const bad of [null, undefined, 'texto', 42]) {
      expect(() => checkPlanHealth(bad, { planType: 'quincena' })).not.toThrow()
    }
    expect(checkPlanHealth(null, { planType: 'quincena' })[0].severity).toBe('error')
  })

  it('marks a missing core section as an error, not a nit', () => {
    const issues = checkPlanHealth(plan({ proyecto: '' }), { planType: 'quincena' })
    expect(errs(issues).some((i) => i.section === 'proyecto')).toBe(true)
  })
})
