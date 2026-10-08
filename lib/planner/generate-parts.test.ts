import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateCheckedPart, generateMainDocument, missingPartFields } from './generate-parts'

const model = vi.hoisted(() => vi.fn())
vi.mock('./model', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./model')>()),
  callPlannerJson: model,
}))

const text =
  'Trabajaré con los niños usando tarjetas, conversaré con ellos y registraré sus ideas para compartirlas al cierre.'
const activities = Array.from({ length: 6 }, (_, i) => `- **Actividad ${i + 1}:** ${text}`).join(
  '\n'
)
const project = ['Inicio', 'Desarrollo', 'Cierre']
  .map((heading) => `**${heading}**\n${activities}`)
  .join('\n\n')
const adjustments = Array.from({ length: 5 }, (_, i) => `## ${i + 1}. Apoyos\n- ${text}`).join('\n')
const core = {
  nombre_proyecto: 'Día de Muertos',
  metodologia: 'Situación Didáctica',
  proyecto: project,
}
const routines = {
  actividades_iniciales: activities,
  actividades_rutina: activities,
  ajustes_razonables: adjustments,
  pausas_activas: text,
}
const assessment = {
  evaluacion_items: Array.from({ length: 4 }, (_, i) => ({
    aspecto: `Reconoce y explica la actividad ${i + 1}`,
  })),
  ejes_articuladores: text,
  estrategia_comunitaria: text,
}
const args = {
  system: 'JSON',
  context: 'Formato de la maestra',
  planType: 'quincena' as const,
  schedule: { lunes: ['Saludo', 'Proyecto'] },
  customTitles: [] as string[],
}

beforeEach(() => {
  vi.clearAllMocks()
  model.mockImplementation(async (_system, _context, opts) => {
    if (opts.label.startsWith('desarrollo')) return core
    if (opts.label.startsWith('actividades')) return routines
    return assessment
  })
})

describe('section-based plan generation', () => {
  it('assembles complete sections, copies the schedule, and bases evaluation on the actual project', async () => {
    const result = await generateMainDocument(args)
    expect(result.proyecto).toContain('**Inicio**')
    expect(result.actividades_iniciales).toBe(activities)
    expect(result.cronograma).toEqual(args.schedule)
    expect(result.evaluacion_items).toHaveLength(4)
    expect(model.mock.calls.find((call) => call[2].label.startsWith('evaluación'))?.[1]).toContain(
      'DESARROLLO YA GENERADO'
    )
    expect(model).toHaveBeenCalledTimes(3)
  })

  it('retries only missing fields, retains valid fields, and ignores unsolicited changes', async () => {
    model.mockResolvedValueOnce({ actividades_iniciales: activities, actividades_rutina: '' })
    model.mockResolvedValueOnce({
      actividades_rutina: activities,
      actividades_iniciales: 'overwrite',
      proyecto: 'overwrite',
    })
    const keys = ['actividades_iniciales', 'actividades_rutina']
    const result = await generateCheckedPart('JSON', 'school format', {
      keys,
      validate: (doc) => missingPartFields(doc, keys),
    })
    expect(result).toEqual({ actividades_iniciales: activities, actividades_rutina: activities })
    expect(model.mock.calls[1][0]).toContain('SOLO estas claves JSON: actividades_rutina.')
  })

  it('fails the complete document when a required section remains missing after retry', async () => {
    model.mockImplementation(async (_system, _context, opts) =>
      opts.label.startsWith('actividades') ? { ...routines, pausas_activas: '' } : core
    )
    await expect(generateMainDocument(args)).rejects.toThrow('actividades y ajustes')
    expect(model.mock.calls.filter((call) => call[2].label.startsWith('actividades'))).toHaveLength(
      2
    )
  })

  it('requires every methodology stage, not just a long first section', () => {
    expect(
      missingPartFields(
        { ...core, proyecto: `**Inicio**\n${activities}\n**Cierre**\n${activities}` },
        ['proyecto']
      )
    ).toEqual(['proyecto'])
    expect(missingPartFields(core, ['proyecto'])).toEqual([])
  })

  it('uses the school’s custom headings instead of imposing default methodology phases', () => {
    const body = `**Exploramos**\n${activities}\n**Compartimos**\n${activities}`
    expect(
      missingPartFields(
        { ...core, proyecto: body },
        ['proyecto'],
        [],
        ['Exploramos', 'Compartimos']
      )
    ).toEqual([])
  })

  it('requires substantive evaluation and does not count blank aspects', () => {
    expect(missingPartFields({ evaluacion_items: [{}, {}, {}, {}] }, ['evaluacion_items'])).toEqual(
      ['evaluacion_items']
    )
  })

  it('keeps custom sections in template order even when the model returns a different order', async () => {
    const standard = model.getMockImplementation()!
    model.mockImplementation(async (system, context, opts) =>
      opts.label.startsWith('secciones')
        ? {
            custom_sections: [
              { title: 'Materiales', content: text },
              { title: 'Propósito', content: text },
            ],
          }
        : standard(system, context, opts)
    )
    const result = await generateMainDocument({
      ...args,
      customTitles: ['Propósito', 'Materiales'],
    })
    expect(
      (result.custom_sections as Array<{ title: string }>).map((section) => section.title)
    ).toEqual(['Propósito', 'Materiales'])
  })

  it('generates a separate reading section when the uploaded format calls for one', async () => {
    const standard = model.getMockImplementation()!
    model.mockImplementation(async (system, context, opts) =>
      opts.label.startsWith('actividades')
        ? { ...routines, aventura_lectora: text }
        : standard(system, context, opts)
    )
    expect((await generateMainDocument({ ...args, separateReading: true })).aventura_lectora).toBe(
      text
    )
  })
})
