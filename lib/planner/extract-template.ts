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
  "evaluation_columns": ["Sí", "No", "Proceso"],
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
  "verb_person": "primera_singular",
  "notes": "tono y estilo en máx 200 chars"
}

REGLAS CRÍTICAS:
- writing_style_samples: copia LITERAL ≥250 chars por fragmento — no parafrasees, no resumas
- pda_bank: copia los Procesos de Desarrollo de Aprendizaje (PDAs) COMPLETOS tal como aparecen — son la fuente de verdad para la generación; NO los abrevies
- evaluation_columns: detecta el formato real ("Sí/No/Proceso", "Logrado/En proceso/Requiere apoyo", u otro)
- sections: TODOS los encabezados en orden exacto, con la ortografía del documento
- verb_person: detecta si la maestra escribe en primera persona singular, plural, o infinitivo
- Si una sección no existe en el documento, omite ese campo (NO inventes)`

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
      userContent = `Formato de planeación:\n---\n${docText.slice(0, 16000)}\n---`
    }
  } else {
    throw new Error('No se recibió ningún archivo.')
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2500,
    temperature: 0,
    system: EXTRACTION_SYSTEM,
    messages: [{ role: 'user', content: userContent }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  try {
    return JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, '')) as TemplateData
  } catch {
    throw new Error('No pude analizar el formato. Intenta con un documento más claro.')
  }
}
