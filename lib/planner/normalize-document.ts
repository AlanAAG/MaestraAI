// Generation (the LLM) occasionally emits a section as an array or object instead of the
// markdown string the renderer/exporter expect. That made sections render blank and broke the
// DOCX download. We normalize the plan_document to a consistent shape at SAVE time (generation +
// edit), so every consumer (viewer, DOCX, embeddings) always sees clean strings — no per-consumer
// band-aids, no half-rendered documents.

// Narrative fields that must be markdown strings.
const STRING_FIELDS = [
  'nombre_proyecto',
  'metodologia',
  'proyecto',
  'desarrollo_taller',
  'actividades_iniciales',
  'actividades_rutina',
  'aventura_lectora',
  'estrategia_comunitaria',
  'pausas_activas',
  'ajustes_razonables',
  'ejes_articuladores',
] as const

// Coerce any shape into readable markdown text.
export function sectionToString(v: unknown): string {
  if (typeof v === 'string') return v
  if (v == null) return ''
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        typeof x === 'string'
          ? x
          : // common object item shapes from the model
            ((x as { texto?: string; text?: string; contenido?: string })?.texto ??
            (x as { text?: string })?.text ??
            (x as { contenido?: string })?.contenido ??
            JSON.stringify(x))
      )
      .map((s) => String(s).trim())
      .filter(Boolean)
      .join('\n\n')
  }
  if (typeof v === 'object') {
    // Object of labeled subsections → "Label: value" lines.
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${typeof val === 'string' ? val : sectionToString(val)}`)
      .join('\n\n')
  }
  return String(v)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSubPlan(sp: any): any {
  if (!sp || typeof sp !== 'object') return sp
  const out = { ...sp }
  if (out.estructura_didactica && typeof out.estructura_didactica === 'object') {
    const ed: Record<string, string> = {}
    for (const [k, val] of Object.entries(out.estructura_didactica)) ed[k] = sectionToString(val)
    out.estructura_didactica = ed
  }
  if ('observaciones' in out) out.observaciones = sectionToString(out.observaciones)
  return out
}

/**
 * Returns a plan_document with every narrative field coerced to a string and structured
 * sub-fields (custom_sections.content, sub_planes) normalized. Structured arrays/objects
 * (campos_formativos, evaluacion_items, cronograma) are left as-is. Pure + idempotent.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePlanDocument(pd: any): any {
  if (!pd || typeof pd !== 'object') return pd
  const out = { ...pd }
  for (const k of STRING_FIELDS) {
    if (k in out) out[k] = sectionToString(out[k])
  }
  if (Array.isArray(out.custom_sections)) {
    out.custom_sections = out.custom_sections
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((cs: any) => ({
        title: typeof cs?.title === 'string' ? cs.title : String(cs?.title ?? ''),
        content: sectionToString(cs?.content),
      }))
      .filter((cs: { title: string; content: string }) => cs.title || cs.content)
  }
  if (Array.isArray(out.sub_planes)) {
    out.sub_planes = out.sub_planes.map(normalizeSubPlan)
  }
  return out
}
