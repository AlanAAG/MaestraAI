import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import zlib from 'node:zlib'
import { validateBase64Image } from '@/lib/file-validation'
import type { TeacherProfile } from '@/types/teacher-profile'
import { readDocxStyle } from './docx-style'

// Kept as an alias so existing imports of TemplateData keep compiling.
export type TemplateData = TeacherProfile

// Detect page orientation from a .docx (a ZIP) by inflating word/document.xml and reading the
// section page size (w:pgSz orient / w vs h). Native zlib — no new dependency.
// ponytail: parses ZIP local headers; works for Word-written docx. Returns null (→ neutral
// 'vertical' default) on any unexpected layout (e.g. data-descriptor entries) rather than guessing.
export function detectDocxOrientation(buf: Buffer): 'horizontal' | 'vertical' | null {
  try {
    let off = 0
    while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
      const method = buf.readUInt16LE(off + 8)
      const compSize = buf.readUInt32LE(off + 18)
      const nameLen = buf.readUInt16LE(off + 26)
      const extraLen = buf.readUInt16LE(off + 28)
      const name = buf.toString('utf8', off + 30, off + 30 + nameLen)
      const dataStart = off + 30 + nameLen + extraLen
      if (name === 'word/document.xml') {
        if (compSize === 0) return null // data descriptor — sizes unknown here; bail to neutral
        const data = buf.subarray(dataStart, dataStart + compSize)
        const xml = (method === 0 ? data : zlib.inflateRawSync(data)).toString('utf8')
        const m = xml.match(/<w:pgSz\b[^>]*>/)
        if (!m) return null
        const tag = m[0]
        if (/w:orient="landscape"/.test(tag)) return 'horizontal'
        if (/w:orient="portrait"/.test(tag)) return 'vertical'
        const w = Number(tag.match(/w:w="(\d+)"/)?.[1] ?? 0)
        const h = Number(tag.match(/w:h="(\d+)"/)?.[1] ?? 0)
        if (w && h) return w > h ? 'horizontal' : 'vertical'
        return null
      }
      off = dataStart + compSize
    }
  } catch {
    /* malformed/unknown zip layout → neutral default */
  }
  return null
}

const EXTRACTION_SYSTEM = `Analiza esta planeación escolar con precisión quirúrgica para extraer su estructura y contenido REUTILIZABLE. Responde ÚNICAMENTE con JSON válido (sin texto adicional):

{
  "raw_text": "Para PDF o imagen: transcripción COMPLETA del documento en orden, con títulos, tablas como filas etiquetadas y nombres de alumnos sustituidos por Alumno. Para DOCX omite este campo porque ya tenemos su texto completo.",
  "sections": ["nombre exacto sección 1 verbatim", "..."],
  "sub_plan_types": ["Proyecto", "Centro de Interés", "Taller Crítico"],
  "subplan_inventory": [
    {"metodologia": "Proyecto", "nombre": "título del proyecto", "secciones": ["Punto de Partida", "Planeación", "..."]},
    {"metodologia": "Centro de Interés", "nombre": "Conozcamos las letras", "secciones": ["1° Momento", "2° Momento", "3° Momento"]},
    {"metodologia": "Taller Crítico", "nombre": "Transformemos la basura", "secciones": ["..."]}
  ],
  "evaluation_columns": ["Sí", "No", "Proceso"],
  "section_samples": {
    "proyecto": "fragmento VERBATIM ≥300 chars del cuerpo principal del proyecto/desarrollo didáctico — la parte más redactada y representativa de la voz de la maestra",
    "actividades_iniciales": "fragmento VERBATIM ≥200 chars de la sección de actividades de inicio/apertura/bienvenida",
    "actividades_rutina": "fragmento VERBATIM ≥200 chars de las rutinas permanentes del grupo",
    "estrategia_comunitaria": "fragmento VERBATIM ≥200 chars de la estrategia comunitaria, fichero de paz, o actividad SEL",
    "aventura_lectora": "fragmento VERBATIM ≥150 chars de la sección de lectura/aventura lectora si existe — omite si no existe",
    "ajustes_razonables": "fragmento VERBATIM ≥150 chars de la sección de ajustes razonables/NEE si existe — omite si no existe"
  },
  "writing_style_samples": [
    "fragmento VERBATIM de ≥250 caracteres que muestre cómo redacta la maestra las actividades del proyecto",
    "fragmento VERBATIM de ≥250 caracteres de la estructura didáctica o momentos",
    "fragmento VERBATIM de ≥250 caracteres de ajustes razonables o estrategia comunitaria"
  ],
  "actividades_iniciales_example": "lista completa de actividades iniciales copiada VERBATIM del documento",
  "actividades_rutina_example": "lista completa de rutinas copiada VERBATIM del documento",
  "estrategia_comunitaria_example": "pasos numerados VERBATIM de la estrategia comunitaria (o Fichero de la Paz)",
  "pda_bank": [
    {
      "campo": "Lenguajes",
      "contenido": "texto exacto del contenido tal como aparece en el documento",
      "pdas": ["texto verbatim del PDA 1 — copia completa, sin abreviar", "texto verbatim del PDA 2"]
    }
  ],
  "school_specifics": {
    "book_series": "Richmond",
    "special_programs": ["PRONI", "Fichero de la Paz"],
    "valor_del_mes_format": "VALOR DEL MES GRATITUD"
  },
  "formatting_rules": {
    "bullet_label_bold": true,
    "section_title_case": "ALL_CAPS",
    "section_heading_level": "h1",
    "section_title_trailing_colon": true,
    "campos_position": "per_subplan",
    "estrategia_comunitaria_format": "numbered_steps",
    "ejes_articuladores_format": "bold_label_paragraph",
    "proyecto_subheadings": ["Punto de Partida", "Planeación", "A trabajar", "Comunicamos Nuestros Logros", "Reflexión sobre el aprendizaje"],
    "ajustes_subheadings": ["Ubicación del Aula", "Ajustes en los Tiempos", "Consignas Accesibles y Claras"],
    "section_separator": "line"
  },
  "verb_person": "primera_singular",
  "notes": "tono y estilo en máx 200 chars"
}

REGLAS CRÍTICAS:
- section_samples: copia LITERAL de cada sección — identifica la sección por su nombre (aunque sea "Desarrollo del Proyecto", "Momentos Pedagógicos", "A trabajar" — mapea al campo más cercano). Solo omite claves de section_samples que genuinamente no existen en el documento.
- writing_style_samples: copia LITERAL ≥250 chars por fragmento — no parafrasees, no resumas
- pda_bank: copia los Procesos de Desarrollo de Aprendizaje (PDAs) COMPLETOS tal como aparecen — son pistas de selección que se verificarán contra el banco oficial; NO los abrevies
- evaluation_columns: detecta el formato real ("Sí/No/Proceso", "Logrado/En proceso/Requiere apoyo", u otro)
- sections: SOLO las secciones PRINCIPALES en orden exacto, con la ortografía del documento. Los momentos y subencabezados internos van en formatting_rules o subplan_inventory; NO los dupliques como secciones principales.
- subplan_inventory: lista CADA sub-planeación que contiene el documento (Proyecto, Centros de Interés, Talleres, ABJ, etc.) con su metodología, su nombre/título y sus secciones internas. Es CLAVE para reproducir la misma estructura.
- verb_person: detecta si la maestra escribe en primera persona singular, plural, o infinitivo
- formatting_rules: detecta los PATRONES DE FORMATO reales del documento (no inventes, observa):
  · bullet_label_bold: true si las viñetas usan etiqueta en negritas ("**Clima:** texto"), false si es texto plano ("Clima: texto")
  · section_title_case: "ALL_CAPS" | "Title Case" | "Sentence case" según cómo escribe los títulos de sección
  · section_heading_level: "h1" si TODAS las secciones usan el mismo nivel de encabezado grande (jerarquía plana, # en cada sección), "h2" si las secciones están anidadas bajo un título mayor. Omite si no es claro.
  · section_title_trailing_colon: true si los títulos terminan en dos puntos ("Actividades Iniciales:"). Omite si no.
  · campos_position: "per_subplan" si los Campos Formativos aparecen como una tabla DENTRO de cada sub-planeación (Letter&Number, Números, Taller…), "top_level" si hay UN solo bloque de campos para toda la quincena. Observa el documento; omite si no es claro.
  · estrategia_comunitaria_format: "numbered_steps" si usa pasos numerados (1. 2. 3.), "paragraphs" si son párrafos
  · ejes_articuladores_format: "bold_label_paragraph" si cada eje es "**Nombre:** párrafo", "plain" si no
  · proyecto_subheadings / ajustes_subheadings: los sub-encabezados EXACTOS y EN ORDEN de esas secciones (omite si no existen)
  · section_separator: "line" si hay una línea/borde entre secciones, "space" si solo espacio, "none" si nada
- Si una sección no existe en el documento, omite ese campo (NO inventes)
- PRIVACIDAD (LFPDPPP): NUNCA copies nombres propios de alumnos. Si un fragmento contiene el nombre de un alumno, sustitúyelo por "Alumno". No extraigas datos personales de menores.`

type ClaudeImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

export async function extractTemplate(input: {
  imageBase64?: string
  imageMimeType?: string
  documentBase64?: string
  documentMimeType?: string
}): Promise<TemplateData> {
  const { imageBase64, imageMimeType, documentBase64, documentMimeType } = input
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    timeout: 100000,
    maxRetries: 0,
  })
  let userContent: Anthropic.MessageParam['content']
  let sourceText = '' // raw doc text (docx) — used for a graceful fallback if JSON extraction fails
  let detectedOrientation: 'horizontal' | 'vertical' | null = null
  let detectedDocxStyle: Awaited<ReturnType<typeof readDocxStyle>> = {}

  if (imageBase64 && imageMimeType) {
    const validation = await validateBase64Image(imageBase64, imageMimeType)
    if (!validation.valid) throw new Error(validation.error ?? 'Invalid image')

    userContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageMimeType as ClaudeImageMimeType,
          data: imageBase64,
        },
      },
      { type: 'text', text: 'Analiza este formato de planeación escolar y extrae su estructura.' },
    ]
  } else if (documentBase64 && documentMimeType) {
    if (
      documentMimeType ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      throw new Error('Por favor convierte tu presentación a PDF antes de subir.')
    }

    if (documentMimeType === 'application/pdf') {
      userContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: documentBase64 },
        } as unknown as Anthropic.TextBlockParam,
        {
          type: 'text',
          text: 'Analiza este formato de planeación escolar y extrae su estructura.',
        },
      ]
    } else {
      // DOCX / DOC path via mammoth
      const buffer = Buffer.from(documentBase64, 'base64')
      detectedOrientation = detectDocxOrientation(buffer)
      detectedDocxStyle = await readDocxStyle(buffer)
      const { value: docText } = await mammoth.extractRawText({ buffer })
      if (!docText || docText.trim().length < 50) {
        throw new Error('El documento no tiene suficiente texto para analizar.')
      }
      if (docText.length > 60000)
        throw new Error(
          'El formato es demasiado extenso. Sube una sola planeación de ejemplo de hasta 60,000 caracteres para conservarla completa.'
        )
      sourceText = docText
      userContent = `Formato de planeación:\n---\n${docText}\n---`
    }
  } else {
    throw new Error('No se recibió ningún archivo.')
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 16000, // Full visual transcription plus structured profile; reject truncation below.
    temperature: 0,
    system: EXTRACTION_SYSTEM,
    // Prefill "{" forces a clean JSON start (no prose/fences); we prepend it back below.
    messages: [
      { role: 'user', content: userContent },
      { role: 'assistant', content: '{' },
    ],
  })

  if (response.stop_reason !== 'end_turn')
    throw new Error(
      'La lectura del formato quedó incompleta. Sube una sola planeación de ejemplo o divide el archivo en documentos más pequeños.'
    )
  const raw = '{' + response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n')
  const parsed = tryParseProfile(raw)

  // A voice-only fallback looked successful to the teacher but contained no section order or
  // layout rules. Reject that upload so it can be retried with a readable document.
  if (!hasTemplateStructure(parsed)) {
    throw new Error(
      'No pude identificar la estructura del formato. Prueba con un PDF legible o un DOCX que contenga texto y encabezados.'
    )
  }
  const profile: TemplateData = parsed

  // Stamp the deterministically-detected page orientation (overrides any LLM guess).
  if (detectedOrientation || Object.keys(detectedDocxStyle).length) {
    profile.formatting_rules = {
      ...(profile.formatting_rules ?? {}),
      ...detectedDocxStyle,
      ...(detectedOrientation && !detectedDocxStyle.page_orientation
        ? { page_orientation: detectedOrientation }
        : {}),
    }
  }

  const fullText = sourceText || profile.raw_text || ''
  if (fullText.length > 60000)
    throw new Error(
      'El ejemplo supera 60,000 caracteres. Sube una sola planeación para conservarla completa.'
    )
  if (fullText.trim().length < 50)
    throw new Error(
      'No se pudo conservar el texto del ejemplo completo. Prueba con un DOCX o un PDF legible.'
    )
  // Protect confirmed headings from the conservative name scrub, which otherwise erases
  // phrases such as "Actividades Iniciales" and "Taller Crítico" as if they were children.
  profile.raw_text = scrubTemplateText(fullText, profile)
  return profile
}

export function hasTemplateStructure(profile: TemplateData | null): profile is TemplateData {
  return (
    !!profile &&
    ((Array.isArray(profile.sections) &&
      profile.sections.length > 0 &&
      profile.sections.every((s) => typeof s === 'string' && s.trim().length > 0)) ||
      (Array.isArray(profile.subplan_inventory) &&
        profile.subplan_inventory.length > 0 &&
        profile.subplan_inventory.every(
          (s) => typeof s?.metodologia === 'string' && s.metodologia.trim().length > 0
        )))
  )
}

function tryParseProfile(raw: string): TemplateData | null {
  const cleaned = raw
    .replace(/^```json\n?/, '')
    .replace(/\n?```$/, '')
    .trim()
  try {
    return JSON.parse(cleaned) as TemplateData
  } catch {
    const first = cleaned.indexOf('{')
    const last = cleaned.lastIndexOf('}')
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1)) as TemplateData
      } catch {
        /* fall through */
      }
    }
    return null
  }
}

// LFPDPPP best-effort scrub for the stored raw text (the AI path is told to anonymize).
// ponytail: replaces runs of 2-3 Capitalized words (the "Nombre Apellido" shape) with "Alumno".
// Ceiling: also catches capitalized non-name phrases (e.g. school names); acceptable for the
// stored example. Upgrade to NER if false positives matter.
export function scrubNames(text: string): string {
  return text.replace(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,2}\b/g, 'Alumno')
}

export function scrubTemplateText(text: string, profile: TeacherProfile): string {
  const headings = [
    ...(profile.sections ?? []),
    ...(profile.formatting_rules?.proyecto_subheadings ?? []),
    ...(profile.formatting_rules?.ajustes_subheadings ?? []),
    ...(profile.subplan_inventory ?? []).flatMap((s) => s.secciones ?? []),
    'Campos Formativos',
    'Centro de Interés',
    'Taller Crítico',
    'Saberes y Pensamiento Científico',
    'Ética, Naturaleza y Sociedades',
    'De lo Humano y lo Comunitario',
  ]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  let protectedText = text
  const replacements: string[] = []
  for (const heading of Array.from(new Set(headings))) {
    if (!protectedText.includes(heading)) continue
    const marker = `⟪${replacements.length}⟫`
    replacements.push(heading)
    protectedText = protectedText.split(heading).join(marker)
  }
  return scrubNames(protectedText).replace(/⟪(\d+)⟫/g, (_, i) => replacements[Number(i)] ?? '')
}
