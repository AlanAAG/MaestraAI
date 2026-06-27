import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { validateBase64Image } from '@/lib/file-validation'
import type { TeacherProfile } from '@/types/teacher-profile'

// Kept as an alias so existing imports of TemplateData keep compiling.
export type TemplateData = TeacherProfile

const EXTRACTION_SYSTEM = `Analiza esta planeación escolar con precisión quirúrgica para extraer su estructura y contenido REUTILIZABLE. Responde ÚNICAMENTE con JSON válido (sin texto adicional):

{
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
- pda_bank: copia los Procesos de Desarrollo de Aprendizaje (PDAs) COMPLETOS tal como aparecen — son la fuente de verdad para la generación; NO los abrevies
- evaluation_columns: detecta el formato real ("Sí/No/Proceso", "Logrado/En proceso/Requiere apoyo", u otro)
- sections: TODOS los encabezados en orden exacto, con la ortografía del documento
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
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  let userContent: Anthropic.MessageParam['content']
  let sourceText = '' // raw doc text (docx) — used for a graceful fallback if JSON extraction fails

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
      const { value: docText } = await mammoth.extractRawText({ buffer })
      if (!docText || docText.trim().length < 50) {
        throw new Error('El documento no tiene suficiente texto para analizar.')
      }
      sourceText = docText
      userContent = `Formato de planeación:\n---\n${docText.slice(0, 16000)}\n---`
    }
  } else {
    throw new Error('No se recibió ningún archivo.')
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8000, // rich profile (verbatim PDAs + voice samples) needs room — was truncating
    temperature: 0,
    system: EXTRACTION_SYSTEM,
    // Prefill "{" forces a clean JSON start (no prose/fences); we prepend it back below.
    messages: [
      { role: 'user', content: userContent },
      { role: 'assistant', content: '{' },
    ],
  })

  const raw = '{' + (response.content[0].type === 'text' ? response.content[0].text : '')
  const parsed = tryParseProfile(raw)
  if (parsed) return parsed

  // Graceful fallback — NEVER hard-reject a valid upload. If JSON extraction failed (e.g.
  // truncation), still store a minimal profile from the raw text so generation gets the voice.
  if (sourceText.trim().length > 50) {
    return {
      writing_style_samples: chunk(sourceText, 600, 3).map(scrubNames),
      notes: 'Formato subido; extracción automática parcial.',
    }
  }
  return { notes: 'Formato subido; extracción automática no disponible.' }
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

// LFPDPPP best-effort scrub for the raw-text fallback (the AI path is told to anonymize).
// ponytail: replaces runs of 2-3 Capitalized words (the "Nombre Apellido" shape) with "Alumno".
// Ceiling: also catches capitalized non-name phrases (e.g. school names); acceptable for the
// rare fallback path. Upgrade to NER if false positives matter.
export function scrubNames(text: string): string {
  return text.replace(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,2}\b/g, 'Alumno')
}

// Splits text into up to `n` substrings of ~`size` chars (verbatim voice samples).
function chunk(text: string, size: number, n: number): string[] {
  const t = text.replace(/\s+/g, ' ').trim()
  const out: string[] = []
  for (let i = 0; i < n && i * size < t.length; i++) {
    out.push(t.slice(i * size, (i + 1) * size))
  }
  return out
}
