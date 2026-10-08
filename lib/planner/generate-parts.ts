import { callPlannerJson, PlannerServiceError, type PlannerModelOptions } from './model'
import { normalizePlanDocument } from './normalize-document'
import { METHODOLOGY_STRUCTURE } from './methodologies'

type Document = Record<string, unknown>
type PartOptions = PlannerModelOptions & {
  keys: string[]
  validate: (doc: Document) => string[]
  onRepair?: (keys: string[]) => void
}

/** Keep valid fields and retry only the missing fields. Never merge unexpected model keys. */
export async function generateCheckedPart(
  system: string,
  context: string,
  opts: PartOptions
): Promise<Document> {
  const result: Document = {}
  let pending = [...opts.keys]
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    opts.signal?.throwIfAborted()
    const scope = `Esta llamada genera SOLO estas claves JSON: ${pending.join(', ')}. El esquema general es contexto, NO una petición de generar todo el documento. Devuelve un objeto JSON con esas claves en el nivel superior y su contenido completo. No generes otras claves. Conserva el formato, la voz y las indicaciones específicas de la maestra. La extensión total del documento se reparte entre llamadas; desarrolla a profundidad las secciones asignadas aquí.`
    try {
      const response = normalizePlanDocument(
        await callPlannerJson<Document>(
          `${system}\n\nALCANCE OBLIGATORIO DE ESTA LLAMADA:\n${scope}`,
          `${context}\n\n${scope}${attempt ? `\nYa completado (solo contexto, conserva su metodología): ${JSON.stringify(result)}\nFaltó contenido en: ${pending.join(', ')}. Completa cada una, con todos sus apartados y actividades.` : ''}`,
          {
            maxTokens: opts.maxTokens,
            cachePrefix: opts.cachePrefix,
            label: `${opts.label}:${attempt + 1}`,
            signal: opts.signal,
            timeoutMs: opts.timeoutMs,
          }
        )
      ) as Document
      const candidate = { ...result }
      for (const key of pending) if (response[key] != null) candidate[key] = response[key]
      const invalid = opts.validate(candidate)
      // An unsuccessful retry cannot overwrite the fields that already passed validation.
      for (const key of pending)
        if (!invalid.includes(key) && candidate[key] != null) result[key] = candidate[key]
      pending = opts.validate(result)
      if (!pending.length) return result
      console.warn(`[planner-part] ${opts.label}: retrying incomplete fields`, pending)
    } catch (error) {
      opts.signal?.throwIfAborted()
      lastError = error
    }
    if (attempt === 0) opts.onRepair?.(pending)
  }
  console.error(
    `[planner-part] ${opts.label}: incomplete`,
    pending,
    lastError instanceof Error ? lastError.message : ''
  )
  if (lastError instanceof PlannerServiceError) throw lastError
  throw new Error(
    `No pude completar ${opts.label ?? 'una sección'}. Tu documento guardado se conserva. Intenta de nuevo.`
  )
}

const titleKey = (title: string) =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

export function missingPartFields(
  doc: Document,
  keys: string[],
  customTitles: string[] = [],
  expectedHeadings?: string[],
  adjustmentHeadings = 5
): string[] {
  return keys.filter((key) => {
    const value = doc[key]
    if (key === 'custom_sections') {
      return (
        !Array.isArray(value) ||
        customTitles.some(
          (title) =>
            !value.some(
              (section) =>
                section &&
                typeof section.title === 'string' &&
                titleKey(section.title) === titleKey(title) &&
                typeof section.content === 'string' &&
                section.content.trim().length > 0
            )
        )
      )
    }
    if (key === 'evaluacion_items')
      return (
        !Array.isArray(value) ||
        value.filter((item) => typeof item?.aspecto === 'string' && item.aspecto.trim().length > 10)
          .length < 4
      )
    if (
      typeof value !== 'string' ||
      /^(?:pendiente|por completar|por definir|n\/?a|\.{3})[.!\s]*$/i.test(value.trim())
    )
      return true
    if (key === 'nombre_proyecto' || key === 'metodologia') return !value.trim()
    if (key === 'proyecto' || key === 'desarrollo_taller') {
      const headings = value.match(/^(?:\*\*[^*]+\*\*:?\s*$|#{1,4}\s.+)/gm) ?? []
      const expected =
        expectedHeadings ??
        (METHODOLOGY_STRUCTURE[String(doc.metodologia)] ?? []).map((moment) => moment.label)
      const normalizeHeading = (text: string) =>
        titleKey(text.replace(/\s*\(.*\)\s*$/, '').replace(/^\d+[°º]?\s*Momento:\s*/i, ''))
          .replace(/[^a-z0-9 ]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      return (
        value.trim().length < 400 ||
        headings.length < 2 ||
        expected.some(
          (title) =>
            !headings.some((heading) => normalizeHeading(heading).includes(normalizeHeading(title)))
        )
      )
    }
    if (key === 'actividades_iniciales' || key === 'actividades_rutina')
      return value.trim().length < 160 || value.split('\n').filter((line) => line.trim()).length < 5
    if (key === 'ajustes_razonables')
      return (
        value.trim().length < 80 || (value.match(/^\s*##\s/gm) ?? []).length < adjustmentHeadings
      )
    return value.trim().length < 80
  })
}

export async function generateMainDocument(args: {
  system: string
  context: string
  planType: 'quincena' | 'mes' | 'taller'
  schedule: Record<string, string[]>
  customTitles: string[]
  separateReading?: boolean
  expectedHeadings?: string[]
  adjustmentHeadings?: number
  cachePrefix?: string
  signal?: AbortSignal
  onRepair?: (keys: string[]) => void
}): Promise<Document> {
  const taller = args.planType === 'taller'
  const tasks = [
    {
      label: 'desarrollo principal',
      keys: ['nombre_proyecto', 'metodologia', taller ? 'desarrollo_taller' : 'proyecto'],
      maxTokens: 12000,
      titles: [] as string[],
    },
    {
      label: 'actividades y ajustes',
      keys: [
        'actividades_iniciales',
        'actividades_rutina',
        'ajustes_razonables',
        'pausas_activas',
        ...(args.separateReading ? ['aventura_lectora'] : []),
      ],
      maxTokens: 10000,
      titles: [] as string[],
    },
    {
      label: 'evaluación y ejes',
      keys: [
        'evaluacion_items',
        'ejes_articuladores',
        ...(!taller ? ['estrategia_comunitaria'] : []),
      ],
      maxTokens: 8000,
      titles: [] as string[],
    },
  ]
  // Small batches prevent a school format with many custom sections becoming one huge response.
  for (let index = 0; index < args.customTitles.length; index += 4) {
    tasks.push({
      label: `secciones del formato ${index / 4 + 1}`,
      keys: ['custom_sections'],
      maxTokens: 8000,
      titles: args.customTitles.slice(index, index + 4),
    })
  }
  const result: Document = {
    tipo: taller ? 'taller' : 'quincena',
    cronograma: args.schedule,
    aventura_lectora: '',
    sub_planes: [],
    custom_sections: [],
  }
  for (let start = 0; start < tasks.length; ) {
    // Evaluation must see the activities it is assessing, rather than inventing a parallel plan.
    const batchSize = start === 0 ? 2 : 3
    const developed = result.proyecto ?? result.desarrollo_taller
    const outcomes = await Promise.allSettled(
      tasks.slice(start, start + batchSize).map(async (task) => {
        const part = await generateCheckedPart(
          args.system,
          `${args.context}${developed ? `\nDESARROLLO YA GENERADO: basa la evaluación y los ejes en estas actividades concretas:\n${developed}` : ''}${task.titles.length ? `\nEn custom_sections incluye SOLO estos títulos, con su ortografía exacta: ${JSON.stringify(task.titles)}` : ''}`,
          {
            keys: task.keys,
            maxTokens: task.maxTokens,
            cachePrefix: args.cachePrefix,
            signal: args.signal,
            label: task.label,
            onRepair: args.onRepair,
            validate: (doc) =>
              missingPartFields(
                doc,
                task.keys,
                task.titles,
                args.expectedHeadings,
                args.adjustmentHeadings
              ),
          }
        )
        // Reorder custom sections deterministically: the viewer uses custom:N positions.
        if (task.titles.length) {
          const sections = part.custom_sections as Array<{ title: string; content: string }>
          part.custom_sections = task.titles.map((title) => ({
            title,
            content: sections.find((s) => titleKey(s.title) === titleKey(title))!.content,
          }))
        }
        return part
      })
    )
    const failure = outcomes.find((outcome) => outcome.status === 'rejected')
    if (failure?.status === 'rejected') throw failure.reason
    for (const outcome of outcomes) {
      if (outcome.status !== 'fulfilled') continue
      const { custom_sections, ...fields } = outcome.value
      Object.assign(result, fields)
      if (Array.isArray(custom_sections))
        (result.custom_sections as unknown[]).push(...custom_sections)
    }
    start += batchSize
  }
  return normalizePlanDocument(result) as Document
}
