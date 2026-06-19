import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { DIARIO_SYSTEM_PROMPT } from '@/prompts/diario'
import { streamToReadable } from '@/lib/claude'
import { checkRateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  // Rate limiting scoped to authenticated user
  const { success, headers } = await checkRateLimit(user.id, 'strict')
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
      { status: 429, headers }
    )
  }

  const { q1, q2, q3, q4, q5, teacherName, weekStart, weekEnd } = parsed.data
  const sanitizedName = teacherName.replace(/[\r\n]/g, ' ')

  // Heuristic strip of likely student names before sending to Anthropic.
  // The diary is a public endpoint so we can't query the teacher's student list;
  // this regex catches capitalized proper-name sequences (2–3 words) as a best-effort guard.
  function stripProperNames(text: string): string {
    return text.replace(
      /\b[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü.]*){1,2}\b/g,
      '[alumno]'
    )
  }

  const userMessage = `
Maestra: ${sanitizedName}
Semana: ${weekStart} al ${weekEnd}

<respuestas_maestra>
1. ¿Qué funcionó bien esta semana?
${stripProperNames(q1) || '(no respondido)'}

2. ¿Qué fue retador?
${stripProperNames(q2) || '(no respondido)'}

3. ¿Cómo respondió el grupo a las actividades?
${stripProperNames(q3) || '(no respondido)'}

4. ¿Qué necesito ajustar para la próxima semana?
${stripProperNames(q4) || '(no respondido)'}

5. ¿Hay algo sobre algún alumno que quieras recordar?
${stripProperNames(q5) || '(no respondido)'}
</respuestas_maestra>
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
