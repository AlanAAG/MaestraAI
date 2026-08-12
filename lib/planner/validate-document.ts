// Strict LOCAL format validation for generated plan_documents. Pure + cheap — runs after
// normalization on every generation so format drift is caught by code, not by the teacher.
// Returns issues (never throws): callers log + stamp them; the doc still ships.

export type FormatIssue = { section: string; issue: string }

const BANNED = [
  { re: /\bPRONI\b/i, msg: 'menciona "PRONI" (interno, nunca visible)' },
  {
    re: /\bE\.?\s?C\.?\s?P\.?\s?C\.?\s?E\.?\s?E\.?\s?L\.?\s?[YV]\b/i,
    msg: 'usa la sigla E.C.P.C.E.E.L.Y',
  },
  { re: /\bletters?\s*(?:&|and|y)\s*n[uú]m(?:bers?|eros?)\b/i, msg: 'combina Letters y Números' },
  { re: /\bmarkdown\b/i, msg: 'contiene la palabra "markdown"' },
  { re: /aprendizajes esperados/i, msg: 'dice "aprendizajes esperados" (NEM: son PDA)' },
]

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

function scanBanned(section: string, text: string, out: FormatIssue[]) {
  for (const b of BANNED) {
    if (b.re.test(text)) out.push({ section, issue: b.msg })
  }
}

/** Validate a normalized quincena/mes plan_document. Talleres get the shared checks only. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validatePlanDocument(pd: any): FormatIssue[] {
  const issues: FormatIssue[] = []
  if (!pd || typeof pd !== 'object') return [{ section: 'documento', issue: 'vacío o malformado' }]
  const isTaller = pd.tipo === 'taller'

  // ── Required sections present and non-trivial ──
  const required = isTaller
    ? ['desarrollo_taller', 'ajustes_razonables', 'actividades_iniciales']
    : ['proyecto', 'ajustes_razonables', 'actividades_iniciales', 'actividades_rutina']
  for (const key of required) {
    if (typeof pd[key] !== 'string' || pd[key].trim().length < 80) {
      issues.push({ section: key, issue: 'faltante o demasiado corta (<80 chars)' })
    }
  }

  // ── Momentos body: bold headings + bullets, no loose prose ──
  const body = String((isTaller ? pd.desarrollo_taller : pd.proyecto) ?? '')
  if (body) {
    const lines = body.split('\n').filter((l) => l.trim())
    const headings = lines.filter((l) => /^(\*\*[^*]+\*\*:?|#{1,4}\s)/.test(l.trim()))
    const bullets = lines.filter((l) => /^[-•]\s/.test(l.trim()))
    const prose = lines.filter(
      (l) => !/^(\*\*[^*]+\*\*:?\s*$|#{1,4}\s|[-•]\s|\d+[.)]\s)/.test(l.trim())
    )
    if (headings.length < 2)
      issues.push({
        section: 'proyecto',
        issue: `solo ${headings.length} momentos en negritas (mínimo 2)`,
      })
    if (bullets.length < 8)
      issues.push({ section: 'proyecto', issue: `solo ${bullets.length} viñetas (mínimo 8)` })
    if (prose.length > 0)
      issues.push({
        section: 'proyecto',
        issue: `${prose.length} líneas de párrafo suelto (todo va en viñetas)`,
      })
  }

  // ── Ajustes razonables: the 5 numbered categories ──
  const aj = String(pd.ajustes_razonables ?? '')
  if (aj) {
    const cats = (aj.match(/^##\s/gm) ?? []).length
    if (cats < 5)
      issues.push({
        section: 'ajustes_razonables',
        issue: `solo ${cats} sub-encabezados ## (deben ser 5)`,
      })
  }

  // ── Cronograma: 5 days, each with activities, cells clean ──
  if (!isTaller) {
    const cron = pd.cronograma
    if (!cron || typeof cron !== 'object') {
      issues.push({ section: 'cronograma', issue: 'faltante' })
    } else {
      for (const d of DAYS) {
        const acts = (cron as Record<string, unknown>)[d]
        if (!Array.isArray(acts) || acts.length < 4) {
          issues.push({
            section: 'cronograma',
            issue: `${d}: ${Array.isArray(acts) ? acts.length : 0} actividades (mínimo 4)`,
          })
        } else {
          for (const a of acts) scanBanned(`cronograma.${d}`, String(a), issues)
        }
      }
    }
    // Campos formativos table must precede the proyecto — never empty.
    if (!Array.isArray(pd.campos_formativos) || pd.campos_formativos.length === 0) {
      issues.push({
        section: 'campos_formativos',
        issue: 'vacío (la tabla Contenidos+PDA es obligatoria)',
      })
    }
    if (!Array.isArray(pd.evaluacion_items) || pd.evaluacion_items.length < 3) {
      issues.push({ section: 'evaluacion_items', issue: 'menos de 3 aspectos de evaluación' })
    }
  }

  // ── Banned strings across every narrative section ──
  for (const [key, val] of Object.entries(pd)) {
    if (typeof val === 'string' && !key.startsWith('_')) scanBanned(key, val, issues)
  }
  // Numeric-grade leak check (NEM: qualitative only) in evaluation items.
  for (const item of Array.isArray(pd.evaluacion_items) ? pd.evaluacion_items : []) {
    const t = String((item as { aspecto?: unknown })?.aspecto ?? '')
    if (/\b\d{1,2}\s*\/\s*10\b|\b\d{1,3}\s*%|calificación de \d/i.test(t)) {
      issues.push({ section: 'evaluacion_items', issue: `lenguaje numérico: "${t.slice(0, 50)}"` })
    }
  }
  return issues
}
