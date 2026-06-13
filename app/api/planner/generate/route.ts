import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { isProniApplicable } from '@/lib/nem-official-data'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'

export const maxDuration = 120

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

    // Rate limiting - strict tier (10/hour for AI generation)
    const { success, headers } = await checkRateLimit(user.id, 'strict')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // Get teacher record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher, error: teacherError } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teacherId = (teacher as any).id as string

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fortnight } = await (supabase as any)
      .from('fortnights')
      .select('*, groups(*)')
      .eq('id', input.fortnight_id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!fortnight || (fortnight as any).teacher_id !== teacherId) {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupGrade = (fortnight as any).groups?.grade || ''
    const includeProni = isProniApplicable(groupGrade)

    // Anonymize student names before they reach Anthropic.
    // Real names are restored server-side after parsing Claude's response.
    const neeMap: Record<string, string> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    neeStudents.forEach((s: any, i: number) => {
      neeMap[`ALUMNO_NEE_${i + 1}`] = s.display_name
    })
    const obsMap: Record<string, string> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    observationStudents.forEach((s: any, i: number) => {
      obsMap[`ALUMNO_OBS_${i + 1}`] = s.display_name
    })

    // Fetch vocabulary for the fortnight's letter weeks so Claude generates
    // lesson plans that use the actual words in the teacher's vocabulary bank.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = fortnight as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vocabItems } = await (supabase as any)
      .from('vocabulary_items')
      .select('word')
      .or(`letter.eq.${fn.letter_week1},letter.eq.${fn.letter_week2}`)
    const vocabList = (vocabItems || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((v: any) => v.word as string)
      .join(', ')

    // Fetch Richmond unit context when set on the fortnight
    let richmondInstructions = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const richmondUnit = (fortnight as any).richmond_unit as string | null | undefined
    if (richmondUnit) {
      const escapedUnit = richmondUnit.replace(/[%_]/g, '\\$&')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ data: assignment }, { data: interactive }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('richmond_assignments')
          .select('instructions')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq('group_id', (fortnight as any).group_id)
          .ilike('title', `%${escapedUnit}%`)
          .order('due_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        // Also check for richer e-book content captured by the Chrome extension
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('richmond_interactive_content')
          .select('content_raw, title')
          .eq('teacher_id', teacherId)
          .ilike('title', `%${escapedUnit}%`)
          .limit(1)
          .maybeSingle(),
      ])
      if (assignment?.instructions) {
        richmondInstructions = String(assignment.instructions).slice(0, 400)
      }
      // E-book content enriches the prompt with actual lesson activities/themes
      if (interactive?.content_raw) {
        const raw = interactive.content_raw as Record<string, unknown>
        const extra = Object.entries(raw)
          .filter(([, v]) => typeof v === 'string' && (v as string).length > 3)
          .map(([k, v]) => `${k}: ${v}`)
          .slice(0, 8)
          .join('\n')
        if (extra) {
          richmondInstructions = richmondInstructions
            ? `${richmondInstructions}\nContenido del libro digital:\n${extra}`
            : `Contenido del libro digital:\n${extra}`
        }
      }
    }

    const prompt = buildPrompt(
      fortnight,
      neeStudents,
      observationStudents,
      includeProni,
      neeMap,
      obsMap,
      vocabList,
      richmondUnit ?? '',
      richmondInstructions
    )

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
            model: 'claude-sonnet-4-6',
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

          const lessonPlans = restoreStudentNames(
            parseClaudeResponse(content.text, fortnight),
            neeMap,
            obsMap
          )

          // Save to database
          for (const plan of lessonPlans) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from('lesson_plans').insert({
              fortnight_id: fortnight.id,
              teacher_id: teacherId,
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

          // Audit log - fortnight creation
          await logAudit({
            teacher_id: teacherId,
            action: AUDIT_ACTIONS.FORTNIGHT_CREATE,
            resource_type: 'fortnight',
            resource_id: fortnight.id,
            metadata: {
              fortnight_number: fortnight.number,
              project_name: fortnight.project_name,
              grade: groupGrade,
              proni_enabled: includeProni,
              days_generated: lessonPlans.length,
            },
            req,
          })

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
  observationStudents: any[],
  includeProni: boolean,
  neeMap: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _obsMap: Record<string, string>,
  vocabList: string = '',
  richmondUnit: string = '',
  richmondInstructions: string = ''
): string {
  const sanitize = (s: string | null | undefined) => (s || '').replace(/[\r\n]/g, ' ').slice(0, 200)
  const projectName = sanitize(fortnight.project_name)
  const monthlyValue = sanitize(fortnight.monthly_value)
  const letterWeek1 = sanitize(fortnight.letter_week1)
  const letterWeek2 = sanitize(fortnight.letter_week2)

  return `Eres una asistente pedagógica experta en educación preescolar mexicana alineada al Nuevo Modelo Educativo (NEM).

CONTEXTO:
- Nivel: Kinder 3 (Preprimaria)
- Quincena ${fortnight.number}: ${projectName}
- Valor del mes: ${monthlyValue}
- Fechas: ${new Date(fortnight.start_date).toLocaleDateString('es-MX')} a ${new Date(fortnight.end_date).toLocaleDateString('es-MX')}
- Letras: Semana 1 = "${letterWeek1}", Semana 2 = "${letterWeek2}"
- Vocabulario disponible: ${vocabList}

CRONOGRAMA FIJO SEMANAL (INVIOLABLE):
Lunes: Honores (mañana), Proyecto mensual
Martes: Computación, Letter & Number (SIEMPRE letra del día)
Miércoles: Ed. Física, Proyecto mensual
Jueves: Cantos y Juegos, Números (SIEMPRE integrados)
Viernes: Cuento con papás, Cierre de Proyecto mensual

ELEMENTOS DIARIOS PERMANENTES:
- Valor del mes (${monthlyValue})
- Pausa activa
- Estrategia comunitaria
- Aventura lectora

ALUMNOS CON NEE (${neeStudents.length}):
${
  Object.keys(neeMap).length > 0
    ? Object.keys(neeMap)
        .map((label) => `- ${label}`)
        .join('\n')
    : '(ninguno)'
}

ALUMNOS CON DÍA DE OBSERVACIÓN:
${observationStudents.length > 0 ? observationStudents.map((_s, i) => `- ALUMNO_OBS_${i + 1} (día: ${_s.observation_day})`).join('\n') : '(ninguno)'}

ALINEACIÓN NEM:
Campos Formativos: ${NEM_FIELDS.join(', ')}
Ejes Articuladores: ${NEM_AXES.join(', ')}

${
  includeProni
    ? `INTEGRACIÓN PRONI (Kinder 3):
Este grupo requiere integración del Programa Nacional de Inglés (PRONI 2024-2025).
Integra al menos UNA de estas áreas de contenido PRONI por semana:
- Familiarization with English (sonidos, ritmo, entonación)
- Vocabulary development (palabras con apoyo visual)
- Oral communication (frases simples, saludos, lenguaje de aula)
- Written language awareness (reconocimiento de letras en inglés)
- Cultural awareness (culturas de habla inglesa)
- Multilingual identity (orgullo del bilingüismo)

Marca las actividades PRONI con [PRONI: nombre_área] en el activity name.
IMPORTANTE: Integra el inglés de forma natural en las actividades, NO como clase separada.
`
    : ''
}
${
  richmondUnit
    ? `UNIDAD RICHMOND ACTUAL: "${richmondUnit}"
${richmondInstructions ? `Contexto de la unidad: ${richmondInstructions}\n` : ''}El vocabulario de inglés del Martes (bloque PRONI) debe estar alineado con esta unidad de Richmond LRP.
`
    : ''
}INSTRUCCIONES:
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

function restoreStudentNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plans: any[],
  neeMap: Record<string, string>,
  obsMap: Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  return plans.map((plan) => ({
    ...plan,
    observation_students: plan.observation_students.map((token: string) => obsMap[token] ?? token),
    nee_reminders: plan.nee_reminders.map((reminder: string) => {
      let r = reminder
      for (const [token, name] of Object.entries(neeMap)) r = r.replaceAll(token, name)
      for (const [token, name] of Object.entries(obsMap)) r = r.replaceAll(token, name)
      return r
    }),
  }))
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
