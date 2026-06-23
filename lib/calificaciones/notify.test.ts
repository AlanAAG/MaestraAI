import { describe, it, expect } from 'vitest'
import { renderTemplate, tareasBlock, escapeHtml, DEFAULT_TEMPLATE } from './notify'

describe('calificaciones notify helpers', () => {
  it('escapes HTML in student/task names (no injection)', () => {
    expect(escapeHtml('<script>&"x')).toBe('&lt;script&gt;&amp;&quot;x')
    expect(tareasBlock([{ title: '<b>U1</b>', due: 'lunes' }])).toContain('&lt;b&gt;U1&lt;/b&gt;')
  })

  it('falls back to the default template when none is saved, and fills placeholders', () => {
    const out = renderTemplate(null, {
      padre: 'Estimada Ana',
      alumno: 'Juan',
      tareas: tareasBlock([{ title: 'Tarea 1', due: 'martes' }]),
      maestra: 'Maestra Ale',
    })
    expect(out.subject).toBe('Recordatorio: tarea pendiente de Juan')
    expect(out.html).toContain('Estimada Ana')
    expect(out.html).toContain('<strong>Juan</strong>')
    expect(out.html).toContain('Tarea 1')
    expect(out.html).toContain('Maestra Ale · MaestraAI')
  })

  it('uses a teacher override template and still escapes the student name', () => {
    const out = renderTemplate(
      { subject: 'Aviso {alumno}', body: 'Hola, {alumno}: {tareas}' },
      { padre: 'x', alumno: '<img>', tareas: '<ul></ul>', maestra: 'M' }
    )
    expect(out.subject).toBe('Aviso &lt;img&gt;')
    expect(out.html).toContain('Hola, &lt;img&gt;:')
    expect(out.html).toContain('<ul></ul>') // tareas is trusted HTML, not escaped
  })

  it('default template references all placeholders', () => {
    expect(DEFAULT_TEMPLATE.body).toContain('{alumno}')
    expect(DEFAULT_TEMPLATE.body).toContain('{tareas}')
    expect(DEFAULT_TEMPLATE.body).toContain('{padre}')
  })
})
