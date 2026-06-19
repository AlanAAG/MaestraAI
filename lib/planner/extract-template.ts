import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { validateBase64Image } from '@/lib/file-validation'

export type TemplateData = {
  sections?: string[]
  activity_blocks?: string[]
  block_descriptions?: Record<string, string>
  notes?: string
  examples?: string[]
}

const EXTRACTION_SYSTEM = `Analiza este formato de planeación escolar y extrae su estructura con precisión quirúrgica. Responde ÚNICAMENTE con JSON válido, sin texto adicional:

{
  "sections": ["nombre exacto sección 1", "nombre exacto sección 2"],
  "activity_blocks": ["Actividades Iniciales", "Desarrollo del Taller", "Pausas Activas"],
  "block_descriptions": {"Actividades Iniciales": "qué va en esta sección", "Desarrollo del Taller": "qué va aquí"},
  "notes": "tono y estilo en máx 120 chars — p.ej. 'Narrativo, detallado, enfoque constructivista, verbos en infinitivo'",
  "examples": ["fragmento verbatim copiado EXACTO del formato", "otro fragmento"]
}

Reglas estrictas:
- sections: TODOS los encabezados/secciones en orden exacto tal como aparecen, con la ortografía exacta del documento
- activity_blocks: SOLO las secciones que describen ACTIVIDADES que los alumnos realizan (excluye metadatos como "Datos Generales", "Campos Formativos"). Máx 6 bloques.
- block_descriptions: para cada activity_block, 1 frase corta de qué tipo de contenido va ahí
- notes: captura el tono real del documento — si usa verbos en infinitivo, si es narrativo o de lista, nivel de detalle
- examples: 2-3 fragmentos copiados LITERALMENTE del documento que muestren cómo se redactan las actividades (máx 150 chars c/u)`

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
      userContent = `Formato de planeación:\n---\n${docText.slice(0, 6000)}\n---`
    }
  } else {
    throw new Error('No se recibió ningún archivo.')
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1000,
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
