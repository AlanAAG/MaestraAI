import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBase64Image } from '@/lib/file-validation'
import { parseLetterGrouped, type VocabItem } from '@/lib/vocabulary/parse'

const ExtractInputSchema = z.object({
  text: z.string().min(1).max(20000).optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.enum(['image/jpeg', 'image/png', 'image/jpg', 'image/webp']).optional(),
  documentBase64: z.string().optional(),
  documentMimeType: z.string().optional(),
})

type Item = VocabItem

async function llmExtract(
  anthropic: Anthropic,
  systemPrompt: string,
  content: Anthropic.MessageParam['content']
): Promise<Item[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    temperature: 0.2,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')
  const jsonMatch =
    block.text.match(/```json\s*([\s\S]*?)\s*```/) || block.text.match(/\{[\s\S]*\}/)
  const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : block.text
  const parsed = JSON.parse(jsonText)
  return (parsed.items ?? []) as Item[]
}

export async function POST(req: NextRequest) {
  try {
    const input = ExtractInputSchema.parse(await req.json())

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'strict')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // Resolve the text to parse: pasted text, or extracted from an uploaded DOCX.
    let text = input.text ?? ''
    const mime = input.documentMimeType ?? ''
    const isDocx =
      mime.includes('wordprocessingml') ||
      mime === 'application/msword' ||
      mime.includes('officedocument')
    if (input.documentBase64 && isDocx) {
      const buffer = Buffer.from(input.documentBase64, 'base64')
      const { value } = await mammoth.extractRawText({ buffer })
      text = value
    }

    // Fast path: deterministic parse for any text we have. No tokens, no truncation.
    if (text.trim()) {
      const items = parseLetterGrouped(text)
      if (items.length >= 3) {
        return NextResponse.json({ items, count: items.length })
      }
    }

    // Otherwise fall back to the LLM (image, PDF, or messy text).
    const systemPrompt = `Eres un asistente que extrae vocabulario educativo de textos, fotos o documentos.

TAREA: Extrae TODAS las palabras de vocabulario. Para cada una:
- Identifica la letra inicial (A-Z)
- Asigna un color educativo (red, blue, green, yellow, purple, pink, orange)
- Limpia la palabra (minúsculas)

FORMATO DE SALIDA (JSON, sin texto adicional):
{ "items": [ {"word": "apple", "letter": "A", "color": "red"} ] }

REGLAS:
- Trata las letras solas (A, B, C...) como encabezados de sección, NO como palabras
- Ignora números y nombres propios
- Si hay duplicados, inclúyelos solo una vez`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    let content: Anthropic.MessageParam['content']

    if (input.imageBase64 && input.imageMimeType) {
      const validation = await validateBase64Image(input.imageBase64, input.imageMimeType)
      if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 })
      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: input.imageMimeType as 'image/jpeg' | 'image/png' | 'image/webp',
            data: input.imageBase64,
          },
        },
        { type: 'text', text: 'Extrae el vocabulario de esta imagen. Devuelve el JSON.' },
      ]
    } else if (input.documentBase64 && mime === 'application/pdf') {
      content = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: input.documentBase64 },
        } as unknown as Anthropic.TextBlockParam,
        {
          type: 'text',
          text: 'Extrae todo el vocabulario de este documento (texto o imagen/OCR). Devuelve el JSON.',
        },
      ]
    } else if (text.trim()) {
      content = [
        {
          type: 'text',
          text: `Extrae el vocabulario de este texto:\n\n${text}\n\nDevuelve el JSON.`,
        },
      ]
    } else {
      return NextResponse.json(
        { error: 'No se recibió texto, imagen ni documento.' },
        { status: 400 }
      )
    }

    const items = await llmExtract(anthropic, systemPrompt, content)
    return NextResponse.json({ items, count: items.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Extract error:', error)
    return NextResponse.json({ error: 'Failed to extract vocabulary' }, { status: 500 })
  }
}
