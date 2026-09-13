/**
 * Post-generation health check for a plan_document.
 *
 * `validatePlanDocument` checks the document against itself (shape, format, banned wording).
 * This checks it against what the generation was SUPPOSED to produce — the sub-plans that were
 * requested, the fichas that were assigned, the Richmond unit the teacher picked. Those failures
 * were previously invisible: a rejected sub-plan only reached console.error, so the teacher was
 * left to notice the hole herself.
 *
 * Pure and cheap: no I/O, never throws, never blocks delivery. Issues are stamped on the document
 * and rendered by the viewer.
 */
import { validatePlanDocument } from './validate-document'

export type Severity = 'error' | 'aviso'
export type HealthIssue = { section: string; issue: string; severity: Severity }

export type PlanExpectations = {
  planType: 'quincena' | 'mes' | 'taller'
  /** Ficha numbers this plan was assigned (one per week). */
  fichaNumbers?: number[]
  /** Did the teacher pick a Richmond unit for this plan? */
  richmondSelected?: boolean
}

type SubPlan = {
  tipo?: string
  nombre?: string
  estructura_didactica?: Record<string, string>
  campos_formativos?: unknown[]
}

const SUB_LABEL: Record<string, string> = {
  letter_number: 'Letters',
  numeros: 'Números',
}

/** A sub-plan counts as generated only if it actually carries teaching content. */
function subPlanIsEmpty(sp: SubPlan | undefined): boolean {
  if (!sp) return true
  const body = Object.values(sp.estructura_didactica ?? {})
    .map((v) => (typeof v === 'string' ? v : ''))
    .join(' ')
    .trim()
  return body.length < 80
}

/** Which ficha numbers the estrategia comunitaria actually cites. */
function citedFichas(text: string): number[] {
  const out: number[] = []
  const re = /Ficha(?:\s+n[úu]mero)?\s+(\d{1,3})/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1])
    if (n && !out.includes(n)) out.push(n)
  }
  return out
}

export function checkPlanHealth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pd: any,
  exp: PlanExpectations
): HealthIssue[] {
  const issues: HealthIssue[] = []
  if (!pd || typeof pd !== 'object') {
    return [{ section: 'documento', issue: 'no se generó', severity: 'error' }]
  }

  // ── Everything validate-document already knows ──
  // A missing or stub section means the generation genuinely failed; the rest is polish.
  for (const i of validatePlanDocument(pd)) {
    issues.push({
      ...i,
      severity: /faltante|vacío|malformado/i.test(i.issue) ? 'error' : 'aviso',
    })
  }

  // ── Sub-plans that were requested but never arrived ──
  if (exp.planType !== 'taller') {
    const subs: SubPlan[] = Array.isArray(pd.sub_planes) ? pd.sub_planes : []
    for (const tipo of ['letter_number', 'numeros'] as const) {
      const sp = subs.find((s) => s?.tipo === tipo)
      if (subPlanIsEmpty(sp)) {
        issues.push({
          section: SUB_LABEL[tipo],
          issue: sp
            ? 'se generó vacía — usa "Generar" en su pestaña para rehacerla'
            : 'no se generó — usa "Generar" en su pestaña',
          severity: 'error',
        })
      }
    }
  }

  // ── Every assigned ficha should appear in the estrategia comunitaria ──
  const fichas = exp.fichaNumbers ?? []
  if (fichas.length) {
    const cited = citedFichas(String(pd.estrategia_comunitaria ?? ''))
    const missing = fichas.filter((n) => !cited.includes(n))
    if (missing.length === fichas.length) {
      issues.push({
        section: 'estrategia_comunitaria',
        issue: `no cita la ficha asignada (${fichas.join(', ')})`,
        severity: 'aviso',
      })
    } else if (missing.length) {
      // Partial: the weekly rotation collapsed back into a single activity.
      issues.push({
        section: 'estrategia_comunitaria',
        issue: `falta la actividad de la ficha ${missing.join(', ')} (una por semana)`,
        severity: 'aviso',
      })
    }
  }

  // ── Richmond picked but never cited ──
  if (exp.richmondSelected) {
    const all = [pd.proyecto, pd.actividades_rutina, JSON.stringify(pd.sub_planes ?? [])]
      .map((v) => (typeof v === 'string' ? v : String(v ?? '')))
      .join(' ')
    if (!/student\s*book|activity\s*book|assessment/i.test(all)) {
      issues.push({
        section: 'proyecto',
        issue: 'elegiste una unidad Richmond pero el documento no cita el libro',
        severity: 'aviso',
      })
    }
  }

  return issues
}
