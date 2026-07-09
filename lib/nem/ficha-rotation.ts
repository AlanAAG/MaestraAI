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

/** Prompt block with the chosen ficha's full text. */
export function buildFichaBlock(f: FichaPaz): string {
  return `<ficha_de_la_paz>
Ficha asignada para ESTA planeación (Fichero de la Paz, SEP):
Ficha número ${f.numero}: "${f.nombre}"

${f.texto}
</ficha_de_la_paz>`
}
