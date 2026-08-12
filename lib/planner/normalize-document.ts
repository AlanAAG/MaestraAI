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

// The school writes the community strategy as an acronym in its schedule, but the planeación must
// spell it out (teacher requirement). Expanded at save AND at render so older saved plans read
// correctly too.
export const ESTRATEGIA_COMUNITARIA_FULL =
  'Estrategias comunitarias para la construcción de espacios escolares libres de violencia'
const ACRONYM_RE = /\bE\.?\s?C\.?\s?P\.?\s?C\.?\s?E\.?\s?E\.?\s?L\.?\s?[YV]\.?/gi

/** Replace the E.C.P.C.E.E.L.Y acronym (any dotted/spaced variant) with its full name. */
export function expandStrategyAcronym(text: string): string {
  return text.replace(ACRONYM_RE, ESTRATEGIA_COMUNITARIA_FULL)
}

// Letters and Números are ALWAYS separate sections, and PRONI is an internal program name —
// never a visible tag. The model still slips "Letters and Numbers (PRONI)" into activity
// labels/sub-plan names; this scrubs it deterministically.
const COMBINED_LETTERS_RE =
  /\b(letters?\s*(?:&|and|y)\s*n[uú]m(?:bers?|eros?)|n[uú]m(?:bers?|eros?)\s*(?:&|and|y)\s*letters?)\b/gi
const PRONI_TAG_RE = /\s*[([]\s*PRONI[^)\]]*[)\]]|\s*[-–—:]\s*PRONI\b/gi

/** Narrative-safe scrub for the mechanical banned strings: expand the acronym, un-merge
 * Letters/Números, drop "(PRONI…)" tags and soften remaining PRONI mentions to "inglés".
 * Wording problems (e.g. "aprendizajes esperados") stay for the validator — rewriting them
 * deterministically would risk mangling the teacher's text. */
export function scrubNarrative(text: string): string {
  return expandStrategyAcronym(text)
    .replace(COMBINED_LETTERS_RE, 'Letters')
    .replace(/\s*[([]\s*PRONI[^)\]]*[)\]]/gi, '')
    .replace(/\bPRONI\b/g, 'inglés')
}

/** Activity/section label cleanup: acronym expansion + un-merge Letters/Números + drop PRONI tags. */
export function normalizeActivityLabel(text: string): string {
  return expandStrategyAcronym(text)
    .replace(COMBINED_LETTERS_RE, 'Letters')
    .replace(PRONI_TAG_RE, '')
    .replace(/ {2,}/g, ' ')
    .trim()
}

// Inside the proyecto / taller / sub-plan momentos the teacher wants ONE BULLET PER IDEA: every
// punto y aparte is a separate topic. The prompt asks for it; this makes it code-guaranteed.
// Headings (**Momento**, ## …), bullets and numbered steps are left untouched.
const HEADING_RE = /^(#{1,6}\s|\*\*[^*]+\*\*:?\s*$)/
const LIST_RE = /^([-•*]\s|\d+[.)]\s)/

// The model often repeats the momento label inside its own text ("1° Momento: En contacto con la
// realidad. Inicio la sesión…") right under the heading that already says it. Strip the echo.
const MOMENTO_ECHO_RE = /^\s*\d+\s*°?\s*Momento\s*:?[^.\n]*\.?\s*/i

export function stripMomentoEcho(text: string): string {
  return text.replace(MOMENTO_ECHO_RE, '')
}

export function bulletizeMomentos(text: string): string {
  const out: string[] = []
  let afterHeading = false
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (HEADING_RE.test(t)) {
      // Blank line before every momento heading → clear space between momentos.
      if (out.length && out[out.length - 1].trim()) out.push('')
      out.push(line)
      afterHeading = true
      continue
    }
    // Blank line after the heading too, so the title breathes on both sides (viewer + Word).
    if (afterHeading && t) out.push('')
    afterHeading = false
    out.push(!t || LIST_RE.test(t) ? line : `- ${t}`)
  }
  return out.join('\n')
}

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
    for (const [k, val] of Object.entries(out.estructura_didactica))
      ed[k] = bulletizeMomentos(stripMomentoEcho(sectionToString(val)))
    out.estructura_didactica = ed
  }
  if (typeof out.nombre === 'string') out.nombre = normalizeActivityLabel(out.nombre)
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
    if (k in out) out[k] = scrubNarrative(sectionToString(out[k]))
  }
  // One bullet per idea inside the didactic development (teacher's format).
  for (const k of ['proyecto', 'desarrollo_taller'] as const) {
    if (typeof out[k] === 'string' && out[k]) out[k] = bulletizeMomentos(out[k])
  }
  // Quality signal (best-effort, no retry): the proyecto must contain bold momento headings.
  if (
    typeof out.proyecto === 'string' &&
    out.proyecto.length > 0 &&
    !/\*\*[^*]{3,}\*\*/.test(out.proyecto)
  ) {
    console.warn(
      '[normalize] proyecto has no bold momento headings — model ignored the structure rule'
    )
  }
  if (out.cronograma && typeof out.cronograma === 'object') {
    const cr: Record<string, unknown> = {}
    for (const [day, acts] of Object.entries(out.cronograma)) {
      cr[day] = Array.isArray(acts)
        ? acts.map((a) => (typeof a === 'string' ? normalizeActivityLabel(a) : a))
        : acts
    }
    out.cronograma = cr
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
