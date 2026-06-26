// Maps teacher-supplied section names → plan_document field keys.
// Used at generation time to embed _section_order + _section_titles in the saved plan_document.

// eslint-disable-next-line no-control-regex
const COMBINING_DIACRITICS = /[̀-ͯ]/g

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Aliases: field key → tokens that appear in teacher section names (normalized, partial match ok).
// Listed from MORE specific to LESS specific within each entry — first match wins.
const ALIASES: [string, string[]][] = [
  [
    'actividades_iniciales',
    [
      'rutinas de inicio',
      'actividades de inicio',
      'actividades iniciales',
      'apertura',
      'bienvenida',
      'entrada',
    ],
  ],
  [
    'actividades_rutina',
    [
      'rutinas permanentes',
      'actividades permanentes',
      'actividades de rutina',
      'actividades fijas',
      'rutina',
    ],
  ],
  [
    'aventura_lectora',
    [
      'aventura lectora',
      'aventura',
      'momento de lectura',
      'lectura compartida',
      'libro viajero',
      'cuento del mes',
    ],
  ],
  [
    'estrategia_comunitaria',
    [
      'estrategia comunitaria',
      'fichero de la paz',
      'estrategia de paz',
      'sel',
      'convivencia',
      'comunitaria',
    ],
  ],
  [
    'pausas_activas',
    ['pausa activa', 'pausas activas', 'recreo activo', 'movimiento', 'actividad fisica'],
  ],
  [
    'ajustes_razonables',
    [
      'ajustes razonables',
      'necesidades educativas',
      'inclusion educativa',
      'atencion diferenciada',
      'diversidad',
      'nee',
      'ajuste',
    ],
  ],
  ['ejes_articuladores', ['ejes articuladores', 'articuladores', 'ejes transversales']],
  [
    'campos_formativos',
    ['campos formativos', 'aprendizajes esperados', 'campo formativo', 'competencias', 'pda'],
  ],
  [
    'proyecto',
    [
      'del proyecto',
      'desarrollo del proyecto',
      'situacion didactica',
      'punto de partida',
      'momentos pedagogicos',
      'proyecto',
    ],
  ],
  [
    'cronograma',
    [
      'cronograma semanal',
      'cronograma',
      'distribucion del tiempo',
      'programacion diaria',
      'horario',
    ],
  ],
  [
    'evaluacion_items',
    [
      'evaluacion de aprendizajes',
      'lista de cotejo',
      'evaluacion formativa',
      'rubrica',
      'evaluacion',
    ],
  ],
]

// Sections that don't serialize as narrative markdown — skip them in the custom-sections path.
export const STRUCTURED_FIELDS = new Set(['cronograma', 'campos_formativos', 'evaluacion_items'])

export function mapSectionName(raw: string): string | null {
  const n = normalize(raw)
  for (const [key, tokens] of ALIASES) {
    if (tokens.some((t) => n.includes(normalize(t)))) return key
  }
  return null
}

export type SectionOrder = Array<string> // field keys + 'custom:N' entries

/**
 * Given the teacher's ordered section list, returns:
 *  - sectionOrder: field keys (and 'custom:N' for unmapped) in teacher's order
 *  - sectionTitles: field key → teacher's own title for that section
 *  - customSectionNames: names for sections that didn't map (to pass to the prompt)
 */
export function buildSectionMeta(sections: string[]): {
  sectionOrder: SectionOrder
  sectionTitles: Record<string, string>
  customSectionNames: string[]
} {
  const sectionOrder: SectionOrder = []
  const sectionTitles: Record<string, string> = {}
  const customSectionNames: string[] = []
  const seen = new Set<string>()

  for (const raw of sections) {
    const key = mapSectionName(raw)
    if (key && !seen.has(key)) {
      seen.add(key)
      sectionOrder.push(key)
      sectionTitles[key] = raw // store teacher's exact title
    } else if (!key) {
      const idx = customSectionNames.length
      customSectionNames.push(raw)
      sectionOrder.push(`custom:${idx}`)
    }
    // duplicate keys (two teacher sections mapping to the same field) are silently deduped;
    // the first occurrence sets the title and the position.
  }

  return { sectionOrder, sectionTitles, customSectionNames }
}

// Default render order when no teacher profile is available.
export const DEFAULT_QUINCENA_ORDER: SectionOrder = [
  'actividades_iniciales',
  'actividades_rutina',
  'aventura_lectora',
  'estrategia_comunitaria',
  'pausas_activas',
  'ajustes_razonables',
  'cronograma',
  'ejes_articuladores',
  'campos_formativos',
  'proyecto',
  'evaluacion_items',
]

export const DEFAULT_TALLER_ORDER: SectionOrder = [
  'ajustes_razonables',
  'desarrollo_taller',
  'actividades_iniciales',
  'actividades_rutina',
  'aventura_lectora',
  'pausas_activas',
  'cronograma',
  'evaluacion_items',
]
