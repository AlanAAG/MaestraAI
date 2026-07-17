// Deterministic snap-to-bank enforcement for campos_formativos.
// The model is INSTRUCTED to copy official Contenidos/PDAs verbatim, but nothing guaranteed it —
// this normalizer makes it code-guaranteed: every generated contenido is fuzzy-matched against
// the official bank and replaced with the official verbatim row (full PDA desglose). Invented or
// unrecognizable contenidos are dropped. Applied after every generation parse (main doc + sub-plans).
import { CONTENIDOS_FASE2_3, type ContenidoPDA } from './contenidos-fase2'
import { PRONI_FASE2 } from './grounding'

// PRONI (inglés, Kinder 3) rows live inside Lenguajes per NEM — expose them in the same shape.
const BANK: ContenidoPDA[] = [
  ...CONTENIDOS_FASE2_3,
  ...PRONI_FASE2.map((p) => ({ campo: 'Lenguajes', contenido: p.contenido, pdas3: p.pdas })),
]

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()

const tokens = (s: string) =>
  new Set(
    normalize(s)
      .split(' ')
      .filter((t) => t.length > 2)
  )

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let inter = 0
  a.forEach((t) => {
    if (b.has(t)) inter++
  })
  return inter / (a.size + b.size - inter)
}

const NORMALIZED_BANK = BANK.map((row) => ({
  row,
  norm: normalize(row.contenido),
  toks: tokens(row.contenido),
}))

/** Fuzzy-match a generated contenido text to an official bank row. Null when unrecognizable. */
export function matchContenido(text: string): ContenidoPDA | null {
  const norm = normalize(String(text ?? ''))
  if (norm.length < 10) return null
  // Tier 1+2: exact or prefix (either direction — the model may truncate or the school table may).
  const prefix = norm.slice(0, 60)
  for (const b of NORMALIZED_BANK) {
    if (b.norm === norm || b.norm.startsWith(prefix) || norm.startsWith(b.norm.slice(0, 60)))
      return b.row
  }
  // Tier 3: token overlap — absorbs transcription variances and mild paraphrase.
  const toks = tokens(text)
  let best: { row: ContenidoPDA; score: number } | null = null
  for (const b of NORMALIZED_BANK) {
    const score = jaccard(toks, b.toks)
    if (score >= 0.6 && (!best || score > best.score)) best = { row: b.row, score }
  }
  return best?.row ?? null
}

type GeneratedCampo = { campo?: unknown; contenidos?: unknown }
type GeneratedContenido = { contenido?: unknown; procesos?: unknown }

/**
 * Snap every generated contenido to its official bank row: verbatim contenido text, the FULL
 * official PDA desglose, and the correct campo. Drops unmatched contenidos, regroups by campo
 * (canonical Fase 2 order), dedupes. Malformed input is returned unchanged.
 */
export function enforceCamposFormativos(campos: unknown): unknown {
  if (!Array.isArray(campos)) return campos
  const byCampo = new Map<string, { contenido: string; procesos: string[] }[]>()
  const seen = new Set<string>()
  let dropped = 0
  for (const c of campos as GeneratedCampo[]) {
    const contenidos = Array.isArray(c?.contenidos) ? (c.contenidos as GeneratedContenido[]) : []
    for (const item of contenidos) {
      const row = matchContenido(String(item?.contenido ?? ''))
      if (!row) {
        dropped++
        continue
      }
      if (seen.has(row.contenido)) continue
      seen.add(row.contenido)
      const arr = byCampo.get(row.campo) ?? []
      arr.push({ contenido: row.contenido, procesos: [...row.pdas3] })
      byCampo.set(row.campo, arr)
    }
  }
  if (dropped) console.warn(`[enforce-contenidos] dropped ${dropped} unmatched contenido(s)`)
  if (!seen.size) return campos // nothing matched → keep model output rather than emptying the doc
  // Canonical campo order (official Fase 2 order), not model-output order.
  const CAMPO_ORDER = [
    'Lenguajes',
    'Saberes y Pensamiento Científico',
    'Ética, Naturaleza y Sociedades',
    'De lo Humano y lo Comunitario',
  ]
  return Array.from(byCampo.entries())
    .sort(([a], [b]) => CAMPO_ORDER.indexOf(a) - CAMPO_ORDER.indexOf(b))
    .map(([campo, contenidos]) => ({ campo, contenidos }))
}
