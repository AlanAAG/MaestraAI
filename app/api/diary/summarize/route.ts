import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { DIARIO_SYSTEM_PROMPT } from '@/prompts/diario'
import { streamToReadable } from '@/lib/claude'

const DiaryInputSchema = z.object({
  q1: z.string().max(2000).optional().default(''),
  q2: z.string().max(2000).optional().default(''),
  q3: z.string().max(2000).optional().default(''),
  q4: z.string().max(2000).optional().default(''),
  q5: z.string().max(2000).optional().default(''),
  teacherName: z.string().max(100).optional().default('Maestra'),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = DiaryInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { q1, q2, q3, q4, q5, teacherName, weekStart, weekEnd } = parsed.data

  const userMessage = `
Maestra: ${teacherName}
Semana: ${weekStart} al ${weekEnd}

1. ¿Qué funcionó bien esta semana?
${q1 || '(no respondido)'}

2. ¿Qué fue retador?
${q2 || '(no respondido)'}

3. ¿Cómo respondió el grupo a las actividades?
${q3 || '(no respondido)'}

4. ¿Qué necesito ajustar para la próxima semana?
${q4 || '(no respondido)'}

5. ¿Hay algo sobre algún alumno que quieras recordar?
${q5 || '(no respondido)'}
`.trim()

  const stream = streamToReadable(DIARIO_SYSTEM_PROMPT, userMessage)

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
