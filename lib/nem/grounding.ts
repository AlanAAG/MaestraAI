// Official NEM Fase-2 grounding injected into generation prompts so the model REPRODUCES
// official Contenidos/PDAs verbatim instead of inventing them.
import { CONTENIDOS_FASE2_3 } from './contenidos-fase2'
import { METHODOLOGY_STRUCTURE } from '@/lib/planner/methodologies'

// The 6 modalidades oficiales (context/campos-formativos-modalidades.md — school ground truth).
// METHODOLOGY_STRUCTURE also holds extra metodologías (Situación Didáctica, ABP…); the always-on
// grounding lists only the official 6 to keep the rule crisp.
const MODALIDADES_OFICIALES = [
  'Taller Crítico',
  'Rincones de Aprendizaje',
  'Centro de Interés',
  'Unidad Didáctica',
  'Aprendizaje Basado en el Juego',
  'Proyecto',
]

// Canonical 7 Ejes Articuladores (Plan de Estudio 2022, §8.1) — verbatim names + essence.
export const EJES_FASE2: { nombre: string; esencia: string }[] = [
  {
    nombre: 'Inclusión',
    esencia: 'reconoce y combate desigualdades (clase, sexo, género, condición, grupo étnico).',
  },
  {
    nombre: 'Pensamiento crítico',
    esencia: 'cuestionamiento reflexivo de la realidad desde la justicia social.',
  },
  {
    nombre: 'Interculturalidad crítica',
    esencia: 'diálogo entre culturas, saberes y lenguas en un marco común.',
  },
  {
    nombre: 'Igualdad de género',
    esencia: 'combate la violencia de género; perspectiva interseccional.',
  },
  {
    nombre: 'Vida saludable',
    esencia: 'salud individual y comunitaria: alimentación, salud mental y planetaria.',
  },
  {
    nombre: 'Apropiación de las culturas a través de la lectura y la escritura',
    esencia: 'la lectura y escritura como prácticas culturales situadas.',
  },
  {
    nombre: 'Artes y experiencias estéticas',
    esencia: 'percepción, creación y disfrute estético a través de los lenguajes artísticos.',
  },
]

// PRONI Fase 2 (inglés, SOLO 3er grado) — 6 contenidos oficiales + PDAs verbatim.
export const PRONI_FASE2: { contenido: string; pdas: string[] }[] = [
  {
    contenido: 'Cuerpo, imagen e identidad',
    pdas: [
      'Identifica y enuncia el nombre, género y edad de sí mismo y de otras personas.',
      'Señala y nombra partes del cuerpo humano.',
    ],
  },
  {
    contenido: 'Sensaciones, emociones, sentimientos e ideas expresados en lengua inglesa',
    pdas: [
      'Identifica sensaciones, emociones, sentimientos e ideas al escuchar y repetir rimas, canciones y otros juegos de lenguaje.',
      'Identifica sensaciones, emociones, sentimientos e ideas al interactuar con otras personas.',
    ],
  },
  {
    contenido: 'Textos orales y escritos en lengua inglesa',
    pdas: [
      'Escucha y repite canciones, adivinanzas, trabalenguas, rimas infantiles y otros juegos de lenguaje sencillos.',
      'Escucha y participa de la lectura de cuentos cortos.',
      'Entiende palabras en cuentos y diversos tipos de textos cortos y las pronuncia.',
    ],
  },
  {
    contenido: 'Manifestaciones culturales y artísticas',
    pdas: [
      'Reconoce y nombra objetos que se emplean en tradiciones, celebraciones y/o festividades.',
      'Identifica y nombra colores y formas presentes en manifestaciones culturales y artísticas.',
      'Identifica expresiones lingüísticas asociadas a manifestaciones culturales.',
    ],
  },
  {
    contenido: 'Entornos naturales y sociales',
    pdas: [
      'Reconoce personas, objetos y acciones en diálogos cortos vinculados con entornos naturales y sociales.',
      'Identifica mensajes en diálogos, carteles o señalizaciones, apoyándose en imágenes.',
      'Reacciona ante situaciones contextuales que identifica en diálogos cortos vinculados con entornos naturales y sociales.',
    ],
  },
  {
    contenido: 'Elementos y recursos gráficos, lúdicos y estéticos de la lengua inglesa',
    pdas: [
      'Imita y reproduce movimientos de personas, animales o acciones indicadas en una canción o rima.',
      'Reconoce pasos para crear o armar un juguete.',
      'Sigue instrucciones sencillas para participar en juegos.',
      'Sigue instrucciones sencillas de una receta de cocina.',
    ],
  },
]

function contenidosBlock(campos?: string[]): string {
  const byCampo = new Map<string, string[]>()
  const src = campos?.length
    ? CONTENIDOS_FASE2_3.filter((c) => campos.includes(c.campo))
    : CONTENIDOS_FASE2_3
  for (const c of src) {
    const lines = byCampo.get(c.campo) ?? []
    lines.push(`  • Contenido: ${c.contenido}\n${c.pdas3.map((p) => `    - PDA: ${p}`).join('\n')}`)
    byCampo.set(c.campo, lines)
  }
  return Array.from(byCampo.entries())
    .map(([campo, items]) => `CAMPO: ${campo}\n${items.join('\n')}`)
    .join('\n\n')
}

function proniBlock(): string {
  return PRONI_FASE2.map(
    (a) =>
      `  • Contenido (inglés): ${a.contenido}\n${a.pdas.map((p) => `    - PDA: ${p}`).join('\n')}`
  ).join('\n')
}

// The grounding block prepended to generation prompts. `includeProni` only for Kinder 3.
// `campos` narrows the Contenidos to specific campos (used by sub-plans to stay lean).
export function nemGroundingBlock(includeProni: boolean, campos?: string[]): string {
  const ejes = EJES_FASE2.map((e) => `  • ${e.nombre}: ${e.esencia}`).join('\n')
  const modalidades = MODALIDADES_OFICIALES.map((m) => {
    // Strip UI annotations ("(incluye el friso)") and ordinal prefixes ("1° Momento: ") so the
    // fases read exactly like the official document's names.
    const fases = (METHODOLOGY_STRUCTURE[m] ?? []).map((f) =>
      f.label.replace(/ \(.*\)$/, '').replace(/^\d+° Momento: /, '')
    )
    return `  • ${m}: ${fases.join(' → ')}`
  }).join('\n')
  return `<contenidos_oficiales fase="2" grado="3">
REGLA ABSOLUTA: Usa y REPRODUCE TEXTUALMENTE estos Contenidos y PDAs oficiales. Está PROHIBIDO inventar, parafrasear o abreviar un PDA. Si un campo/contenido no aplica al proyecto, simplemente no lo uses — pero cuando lo uses, cópialo VERBATIM.

${contenidosBlock(campos)}
</contenidos_oficiales>

<ejes_articuladores>
Los 7 ejes articuladores cruzan TODOS los campos (no son una sección aislada). Selecciona los 2-3 más pertinentes y muéstralos conectados a actividades concretas:
${ejes}
</ejes_articuladores>

<evaluacion_formativa>
La evaluación es CUALITATIVA, continua y basada en la observación sistemática — NUNCA numérica ni porcentajes. Instrumentos válidos: observación sistemática, registro de avance, diario de trabajo, portafolio de evidencias, rúbrica, lista de cotejo. Cada aspecto a evaluar debe ser observable y redactado de forma concreta.
</evaluacion_formativa>

<modalidades>
Las 6 modalidades de trabajo oficiales. TODOS los campos formativos pueden trabajarse a través de CUALQUIER modalidad — la elección depende de la intención pedagógica, no del campo. Cada modalidad sigue sus fases EXACTAS, EN ESTE ORDEN (usa estos nombres de fase textualmente como encabezados):
${modalidades}
</modalidades>${
    includeProni
      ? `

<proni_contenidos grado="3">
PRONI (inglés, SOLO Tercer grado / Kinder 3). Usa estos contenidos y PDAs VERBATIM en las actividades de inglés:
${proniBlock()}
</proni_contenidos>`
      : ''
  }`
}
