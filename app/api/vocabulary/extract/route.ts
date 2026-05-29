import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBase64Image } from '@/lib/file-validation'

const ExtractInputSchema = z.object({
  text: z.string().min(1).max(10000).optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = ExtractInputSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - strict tier (10/hour for Claude Vision API)
    const { success, headers } = await checkRateLimit(user.id, 'strict')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // Validate image if provided (magic bytes, dimensions, size)
    if (input.imageBase64 && input.imageMimeType) {
      const validation = await validateBase64Image(input.imageBase64, input.imageMimeType)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    // Build prompt based on input type
    const systemPrompt = `Eres un asistente que extrae vocabulario educativo de textos, notas, fotos o documentos.

TAREA:
Extrae todas las palabras de vocabulario que encuentres. Para cada palabra:
- Identifica la letra inicial (A-Z)
- Asigna un color educativo (red, blue, green, yellow, purple, pink, orange)
- Limpia la palabra (minúsculas, sin acentos en la letra, singular preferido)

FORMATO DE SALIDA (JSON):
{
  "items": [
    {"word": "apple", "letter": "A", "color": "red"},
    {"word": "ball", "letter": "B", "color": "blue"}
  ]
}

REGLAS:
- Solo palabras en inglés para enseñanza preescolar
- Ignora números, nombres propios, palabras muy largas
- Agrupa por color temático: frutas=red, animales=green, objetos=blue, etc.
- Si hay duplicados, incluye solo una vez`

    let content: Anthropic.MessageParam['content'] = []

    if (input.imageBase64 && input.imageMimeType) {
      // Vision mode - extract from image
      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: input.imageMimeType as
              | 'image/jpeg'
              | 'image/png'
              | 'image/gif'
              | 'image/webp',
            data: input.imageBase64,
          },
        },
        {
          type: 'text',
          text: 'Extrae todas las palabras de vocabulario que veas en esta imagen (puede ser una foto de un libro, notas escritas a mano, lista impresa, etc.). Devuelve el JSON con las palabras encontradas.',
        },
      ]
    } else if (input.text) {
      // Text mode - extract from pasted text
      content = [
        {
          type: 'text',
          text: `Extrae todas las palabras de vocabulario de este texto:\n\n${input.text}\n\nDevuelve el JSON con las palabras encontradas.`,
        },
      ]
    } else {
      return NextResponse.json({ error: 'No text or image provided' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    })

    const responseText = response.content[0]
    if (responseText.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Parse JSON from response
    const jsonMatch =
      responseText.text.match(/```json\s*([\s\S]*?)\s*```/) ||
      responseText.text.match(/\{[\s\S]*\}/)
    const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText.text

    const parsed = JSON.parse(jsonText)

    return NextResponse.json({
      items: parsed.items || [],
      count: parsed.items?.length || 0,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Extract error:', error)
    return NextResponse.json({ error: 'Failed to extract vocabulary' }, { status: 500 })
  }
}
