import { describe, it, expect } from 'vitest'
import { validatePlanDocument } from './validate-document'

const CRON = Object.fromEntries(
  ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].map((d) => [
    d,
    ['activación', 'proyecto', 'lunch', 'recreo', 'despedida'],
  ])
)

function goodPlan() {
  return {
    tipo: 'quincena',
    proyecto:
      '**Punto de Partida**\n\n' +
      Array.from(
        { length: 9 },
        (_, i) => `- Actividad concreta número ${i + 1} del proyecto.`
      ).join('\n') +
      '\n\n**A trabajar**\n\n- Otra actividad más del proyecto para cerrar bien.',
    ajustes_razonables:
      '- Para todo el grupo.\n## 1. Ubicación\n- x\n## 2. Tiempos\n- x\n## 3. Consignas\n- x\n## 4. Atención\n- x\n## 5. Autorregulación\n- x'.padEnd(
        120,
        '.'
      ),
    actividades_iniciales: '- Saludo con canción.\n- Pase de lista con fotos.'.padEnd(100, '.'),
    actividades_rutina: '- Valor del mes.\n- Lavado de manos.'.padEnd(100, '.'),
    cronograma: CRON,
    campos_formativos: [{ campo: 'Lenguajes', contenidos: [{ contenido: 'x', procesos: ['p'] }] }],
    evaluacion_items: [
      { aspecto: 'Reconoce la letra' },
      { aspecto: 'Traza' },
      { aspecto: 'Cuenta' },
    ],
  }
}

describe('validatePlanDocument', () => {
  it('passes a well-formed plan with zero issues', () => {
    expect(validatePlanDocument(goodPlan())).toEqual([])
  })

  it('flags prose paragraphs and missing bullets in the proyecto', () => {
    const pd = goodPlan()
    pd.proyecto = '**Punto de Partida**\nUn párrafo largo sin viñetas que lo explica todo junto.'
    const issues = validatePlanDocument(pd)
    expect(issues.some((i) => i.issue.includes('párrafo suelto'))).toBe(true)
    expect(issues.some((i) => i.issue.includes('viñetas'))).toBe(true)
  })

  it('flags banned strings: PRONI, sigla, Letters+Números, aprendizajes esperados', () => {
    const pd = goodPlan()
    pd.cronograma = { ...CRON, martes: ['Letters and Numbers (PRONI)', 'a', 'b', 'c'] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(pd as any).ejes_articuladores = 'Trabajamos los aprendizajes esperados con E.C.P.C.E.E.L.Y'
    const issues = validatePlanDocument(pd)
    expect(issues.some((i) => i.issue.includes('PRONI'))).toBe(true)
    expect(issues.some((i) => i.issue.includes('combina Letters'))).toBe(true)
    expect(issues.some((i) => i.issue.includes('sigla'))).toBe(true)
    expect(issues.some((i) => i.issue.includes('aprendizajes esperados'))).toBe(true)
  })

  it('flags structural gaps: ajustes categories, empty campos, thin cronograma', () => {
    const pd = goodPlan()
    pd.ajustes_razonables = '- Solo un párrafo sin categorías.'.padEnd(100, '.')
    pd.campos_formativos = []
    pd.cronograma = { ...CRON, viernes: ['solo una'] }
    const issues = validatePlanDocument(pd)
    expect(issues.some((i) => i.section === 'ajustes_razonables')).toBe(true)
    expect(issues.some((i) => i.section === 'campos_formativos')).toBe(true)
    expect(issues.some((i) => i.issue.includes('viernes'))).toBe(true)
  })

  it('flags numeric-grade language in evaluation (NEM qualitative rule)', () => {
    const pd = goodPlan()
    pd.evaluacion_items = [{ aspecto: 'Logra 8/10 en conteo' }, { aspecto: 'a' }, { aspecto: 'b' }]
    expect(validatePlanDocument(pd).some((i) => i.issue.includes('numérico'))).toBe(true)
  })
})
