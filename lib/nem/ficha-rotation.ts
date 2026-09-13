// Pick which Fichero de la Paz ficha the next planeación works on.
// Rotation is CODE-side (deterministic), not left to the LLM: each plan uses a different ficha.
import { FICHAS_PAZ, type FichaPaz } from './fichero-paz'

/** Collect ficha numbers cited in past estrategia_comunitaria texts ("Ficha número 48", "Ficha 5"). */
export function extractUsedFichas(texts: Array<string | null | undefined>): number[] {
  const used: number[] = []
  for (const t of texts) {
    if (!t) continue
    const re = /Ficha(?:\s+n[úu]mero)?\s+(\d{1,3})/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(t)) !== null) {
      const n = Number(m[1])
      if (n && !used.includes(n)) used.push(n)
    }
  }
  return used
}

/** First preescolar ficha not yet used; when all are used, wrap around deterministically. */
export function pickFicha(used: number[]): FichaPaz {
  const unused = FICHAS_PAZ.find((f) => !used.includes(f.numero))
  return unused ?? FICHAS_PAZ[used.length % FICHAS_PAZ.length]
}

/**
 * One ficha per WEEK of the plan, all distinct.
 *
 * The estrategia comunitaria is a weekly activity, so a quincena needs two fichas and a
 * month plan four. Picking a single one per plan meant week 2 repeated week 1's activity.
 * Each pick feeds the next call's `used` list so the weeks never collide.
 */
export function pickFichas(used: number[], weeks: number): FichaPaz[] {
  const picked: FichaPaz[] = []
  const seen = [...used]
  for (let i = 0; i < Math.max(1, weeks); i++) {
    const f = pickFicha(seen)
    picked.push(f)
    seen.push(f.numero)
  }
  return picked
}

/** Prompt block with each week's ficha and its full text. */
export function buildFichaBlock(fichas: FichaPaz | FichaPaz[]): string {
  const list = Array.isArray(fichas) ? fichas : [fichas]
  const weekly = list.length > 1
  const body = list
    .map(
      (f, i) =>
        `${weekly ? `SEMANA ${i + 1} — ` : ''}Ficha número ${f.numero}: "${f.nombre}"\n\n${f.texto}`
    )
    .join('\n\n---\n\n')

  const rule = weekly
    ? `La estrategia comunitaria CAMBIA cada semana. Escribe una actividad por semana, cada una basada en SU ficha y citándola por número ("Ficha número N"). NO repitas la misma actividad en las ${list.length} semanas.`
    : 'Basa la estrategia comunitaria en esta ficha y cítala por número ("Ficha número N").'

  return `<ficha_de_la_paz>
Fichas asignadas para ESTA planeación (Fichero de la Paz, SEP).
${rule}

${body}
</ficha_de_la_paz>`
}
