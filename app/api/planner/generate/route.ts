import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

const GenerateInputSchema = z.object({
  fortnight_id: z.string().uuid(),
})

const NEM_FIELDS = [
  'Lenguajes',
  'Saberes y Pensamiento Científico',
  'Ética, Naturaleza y Sociedades',
  'De lo Humano y lo Comunitario',
]

const NEM_AXES = [
  'Inclusión',
  'Pensamiento crítico',
  'Interculturalidad',
  'Igualdad de género',
  'Vida saludable',
  'Lectura y escritura',
  'Artes',
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = GenerateInputSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fortnight } = await (supabase as any)
      .from('fortnights')
      .select('*, groups(*)')
      .eq('id', input.fortnight_id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!fortnight || (fortnight as any).teacher_id !== user.id) {
      return NextResponse.json({ error: 'Fortnight not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: students } = await (supabase as any)
      .from('students')
      .select('*')
      .eq('group_id', fortnight.group_id)
      .order('display_name')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const neeStudents = students?.filter((s: any) => s.has_nee) || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const observationStudents = students?.filter((s: any) => s.observation_day) || []

    const prompt = buildPrompt(fortnight, neeStudents, observationStudents)

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Phase 1: Preparing
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'preparing' })}\n\n`))

        // Phase 2: Analyzing
        await new Promise((resolve) => setTimeout(resolve, 800))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'analyzing' })}\n\n`))

        // Phase 3: Generating
        await new Promise((resolve) => setTimeout(resolve, 1200))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'generating' })}\n\n`))

        try {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: 4096,
            temperature: 0.7,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          })

          const content = response.content[0]
          if (content.type !== 'text') {
            throw new Error('Unexpected response type')
          }

          const lessonPlans = parseClaudeResponse(content.text, fortnight)

          // Save to database
          for (const plan of lessonPlans) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from('lesson_plans').insert({
              fortnight_id: fortnight.id,
              teacher_id: user.id,
              day_number: plan.day_number,
              date: plan.date,
              day_of_week: plan.day_of_week,
              methodology: plan.methodology,
              blocks: plan.blocks,
              vocabulary: plan.vocabulary,
              observation_students: plan.observation_students,
              nee_reminders: plan.nee_reminders,
              approved: false,
            })
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        } catch (error) {
          console.error('Claude API error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`)
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { error: 'Invalid input', details: (error as any).errors },
        { status: 400 }
      )
    }
    console.error('Generate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fortnight: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  neeStudents: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  observationStudents: any[]
): string {
  const vocabList = ''

  return `Eres una asistente pedagógica experta en educación preescolar mexicana alineada al Nuevo Modelo Educativo (NEM).

CONTEXTO:
- Nivel: Kinder 3 (Preprimaria)
- Quincena ${fortnight.number}: ${fortnight.project_name}
- Valor del mes: ${fortnight.monthly_value}
- Fechas: ${new Date(fortnight.start_date).toLocaleDateString('es-MX')} a ${new Date(fortnight.end_date).toLocaleDateString('es-MX')}
- Letras: Semana 1 = "${fortnight.letter_week1}", Semana 2 = "${fortnight.letter_week2}"
- Vocabulario disponible: ${vocabList}

CRONOGRAMA FIJO SEMANAL (INVIOLABLE):
Lunes: Honores (mañana), Proyecto mensual
Martes: Computación, Letter & Number (SIEMPRE letra del día)
Miércoles: Ed. Física, Proyecto mensual
Jueves: Cantos y Juegos, Números (SIEMPRE integrados)
Viernes: Cuento con papás, Cierre de Proyecto mensual

ELEMENTOS DIARIOS PERMANENTES:
- Valor del mes (${fortnight.monthly_value})
- Pausa activa
- Estrategia comunitaria
- Aventura lectora

ALUMNOS CON NEE (${neeStudents.length}):
${neeStudents.map((s) => `- ${s.display_name}`).join('\n')}

ALUMNOS CON DÍA DE OBSERVACIÓN:
${observationStudents.map((s) => `- ${s.display_name} (${s.observation_day})`).join('\n')}

ALINEACIÓN NEM:
Campos Formativos: ${NEM_FIELDS.join(', ')}
Ejes Articuladores: ${NEM_AXES.join(', ')}

INSTRUCCIONES:
Genera 10 días de planeaciones (2 semanas × 5 días). Para cada día:

1. Respeta el cronograma fijo
2. Letter & Number SOLO el martes
3. Números SOLO el jueves
4. Incluye los 4 elementos permanentes diarios
5. Integra el proyecto mensual los días indicados
6. Usa vocabulario de la letra correspondiente
7. Asigna observaciones según día de observación
8. Incluye recordatorios NEE cuando sea relevante
9. Alinea cada bloque a un Campo Formativo y un Eje Articulador

FORMATO DE SALIDA (JSON):
Devuelve un array de 10 objetos, cada uno con:
{
  "day_number": 1-10,
  "date": "2026-05-26",
  "day_of_week": "lunes",
  "methodology": "project_based" | "play_based" | "experiential",
  "blocks": [
    {
      "time": "9:00-9:30",
      "activity": "Nombre de la actividad",
      "methodology": "project_based",
      "materials": ["material1", "material2"],
      "nem_field": "Lenguajes",
      "nem_axis": "Lectura y escritura"
    }
  ],
  "vocabulary": ["word1", "word2"],
  "observation_students": ["Aitana R.", "Maria R."],
  "nee_reminders": ["Recordatorio específico para alumno NEE"]
}

IMPORTANTE:
- NO uses evaluación numérica, porcentajes, o calificaciones
- Usa SOLO evaluación cualitativa: "Sí", "En proceso", "No"
- Sé específica y concreta, no genérica
- Integra el inglés de forma natural (no como clase separada)

Genera las 10 planeaciones ahora:`
}

function parseClaudeResponse(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fortnight: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/)
    const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text

    const parsed = JSON.parse(jsonText)

    // Calculate dates
    const startDate = new Date(fortnight.start_date)
    const plans = []

    for (let i = 0; i < 10; i++) {
      const dayData = Array.isArray(parsed) ? parsed[i] : parsed
      const currentDate = new Date(startDate)

      // Skip weekends
      let daysToAdd = i
      const weekendDays = Math.floor(i / 5) * 2
      daysToAdd += weekendDays
      currentDate.setDate(startDate.getDate() + daysToAdd)

      const dayOfWeek = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'][i % 5]

      plans.push({
        day_number: i + 1,
        date: currentDate.toISOString().split('T')[0],
        day_of_week: dayOfWeek,
        methodology: dayData?.methodology || 'project_based',
        blocks: dayData?.blocks || [],
        vocabulary: dayData?.vocabulary || [],
        observation_students: dayData?.observation_students || [],
        nee_reminders: dayData?.nee_reminders || [],
      })
    }

    return plans
  } catch (error) {
    console.error('Parse error:', error)
    throw new Error('Failed to parse Claude response')
  }
}
