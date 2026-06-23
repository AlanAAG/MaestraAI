import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { isProniApplicable } from '@/lib/nem-official-data'
import { checkRateLimit } from '@/lib/rate-limit'
import { decryptName } from '@/lib/students/name'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'
import { parseClaudeResponse } from '@/lib/planner/parse-response'

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

const SYSTEM_PROMPT =
  'Eres una asistente pedagógica experta en educación preescolar mexicana alineada al Nuevo Modelo Educativo (NEM) 2024. Generas planeaciones didácticas de alta calidad para grupos de Kinder 3 (5-6 años). Respondes ÚNICAMENTE con un objeto JSON válido con clave "days" que contiene el array de planeaciones, sin texto adicional, sin markdown, sin explicaciones.'

async function callSonnet(prompt: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })
  const content = resp.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}

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

    // Fetch teacher-level planning context (period duration + school template)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacherCtx } = await (supabase as any)
      .from('teachers')
      .select('english_period_minutes, plan_template')
      .eq('id', teacherId)
      .single()
    const periodMinutes: number = teacherCtx?.english_period_minutes ?? 45
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const planTemplate: { sections?: string[]; notes?: string; examples?: string[] } | null =
      teacherCtx?.plan_template ?? null

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
    for (let i = 0; i < neeStudents.length; i++) {
      neeMap[`ALUMNO_NEE_${i + 1}`] = (await decryptName(neeStudents[i])).name
    }
    const obsMap: Record<string, string> = {}
    for (let i = 0; i < observationStudents.length; i++) {
      obsMap[`ALUMNO_OBS_${i + 1}`] = (await decryptName(observationStudents[i])).name
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = fortnight as any
    const physicalMaterials: string[] = Array.isArray(fn.physical_materials)
      ? (fn.physical_materials as string[])
      : []

    // Teacher-selected vocab takes priority; fall back to letter-based lookup
    let vocabList: string
    if (Array.isArray(fn.vocabulary) && fn.vocabulary.length > 0) {
      vocabList = (fn.vocabulary as string[]).join(', ')
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: vocabItems } = await (supabase as any)
        .from('vocabulary_items')
        .select('word')
        .or(`letter.eq.${fn.letter_week1},letter.eq.${fn.letter_week2}`)
      vocabList = (vocabItems || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((v: any) => v.word as string)
        .join(', ')
    }

    // Fetch Richmond unit context when set on the fortnight
    let richmondInstructions = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const richmondUnit = (fortnight as any).richmond_unit as string | null | undefined
    if (richmondUnit) {
      const escapedUnit = richmondUnit.replace(/[%_]/g, '\\$&')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignment } = await (supabase as any)
        .from('richmond_assignments')
        .select('instructions')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('group_id', (fortnight as any).group_id)
        .ilike('title', `%${escapedUnit}%`)
        .order('due_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (assignment?.instructions) {
        richmondInstructions = String(assignment.instructions).slice(0, 400)
      }
    }

    const prompt = buildPrompt(
      fortnight,
      observationStudents,
      includeProni,
      neeMap,
      obsMap,
      vocabList,
      richmondUnit ?? '',
      richmondInstructions,
      periodMinutes,
      planTemplate,
      physicalMaterials
    )

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
          let responseText: string
          if (process.env.OPENAI_API_KEY) {
            try {
              const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
              const resp = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                max_tokens: 8192,
                temperature: 0.3,
                response_format: { type: 'json_object' },
                messages: [
                  { role: 'system', content: SYSTEM_PROMPT },
                  { role: 'user', content: prompt },
                ],
              })
              responseText = resp.choices[0]?.message?.content ?? ''
            } catch (openaiErr) {
              console.error('[planner] GPT-4o-mini failed, falling back to Sonnet:', openaiErr)
              responseText = await callSonnet(prompt)
            }
          } else {
            responseText = await callSonnet(prompt)
          }

          const lessonPlans = restoreStudentNames(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parseClaudeResponse(responseText, (fortnight as any).start_date as string),
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
          const errMsg = error instanceof Error ? error.message : String(error)
          console.error('[planner/generate] Claude API error:', errMsg, error)
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
  observationStudents: any[],
  includeProni: boolean,
  neeMap: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _obsMap: Record<string, string>,
  vocabList: string = '',
  richmondUnit: string = '',
  richmondInstructions: string = '',
  periodMinutes: number = 45,
  planTemplate: {
    sections?: string[]
    activity_blocks?: string[]
    block_descriptions?: Record<string, string>
    notes?: string
    examples?: string[]
  } | null = null,
  physicalMaterials: string[] = []
): string {
  const sanitize = (s: string | null | undefined) => (s || '').replace(/[\r\n]/g, ' ').slice(0, 200)
  const projectName = sanitize(fortnight.project_name)
  const monthlyValue = sanitize(fortnight.monthly_value)
  const letterWeek1 = sanitize(fortnight.letter_week1)
  const letterWeek2 = sanitize(fortnight.letter_week2)

  const startStr = new Date(fortnight.start_date).toLocaleDateString('es-MX')
  const endStr = new Date(fortnight.end_date).toLocaleDateString('es-MX')

  // Letter & Number / Números days are per-group config — never hardcode (CLAUDE.md rule).
  const sched = fortnight.groups?.fixed_weekly_schedule
  const letterDay: string = sched?.letter_number_day ?? 'martes'
  const numDay: string = sched?.numeros_day ?? 'jueves'
  const cap = (d: string) => d.charAt(0).toUpperCase() + d.slice(1)

  const neeSection =
    Object.keys(neeMap).length > 0
      ? `ALUMNOS CON NEE:\n${Object.keys(neeMap)
          .map((label) => `- ${label}`)
          .join('\n')}`
      : 'NEE: (ninguno)'

  const obsSection =
    observationStudents.length > 0
      ? `OBSERVACIONES:\n${observationStudents.map((_s, i) => `- ALUMNO_OBS_${i + 1} → día ${_s.observation_day}`).join('\n')}`
      : ''

  const proniSection = includeProni
    ? `PRONI (Kinder 3 — integrar de forma natural, NO como clase separada):
Áreas: Familiarization with English | Vocabulary development | Oral communication | Written language awareness | Cultural awareness | Multilingual identity
Mínimo 1 actividad PRONI por semana en el bloque de ${cap(letterDay)}. Marca con [PRONI: área].`
    : ''

  const richmondSection = richmondUnit
    ? `UNIDAD RICHMOND: "${richmondUnit}"${richmondInstructions ? `\n${richmondInstructions.slice(0, 300)}` : ''}\nBloque PRONI de ${cap(letterDay)} debe alinearse a esta unidad.`
    : ''

  const materialsBaseline =
    'pizarrón, crayones, hojas, proyector, tijeras, pegamento, flashcards MaestraIA'
  const materialsExtra = physicalMaterials.length > 0 ? `, ${physicalMaterials.join(', ')}` : ''
  const materialsSection = `MATERIALES DISPONIBLES: ${materialsBaseline}${materialsExtra}. Usa solo estos en el campo "materials" de cada bloque.`

  const templateSection = planTemplate?.sections?.length
    ? [
        `FORMATO DE TU ESCUELA (secciones exactas): ${planTemplate.sections.join(' → ')}`,
        planTemplate.notes ? `ESTILO REQUERIDO: ${planTemplate.notes}` : '',
        planTemplate.activity_blocks?.length
          ? `BLOQUES OBLIGATORIOS POR DÍA (en este orden exacto, usa estos nombres literalmente como campo "label"):\n${planTemplate.activity_blocks.map((b, i) => `${i + 1}. "${b}"${planTemplate.block_descriptions?.[b] ? ` — ${planTemplate.block_descriptions[b]}` : ''}`).join('\n')}`
          : '',
        planTemplate.examples?.length
          ? `VOZ DE LA MAESTRA — copia este estilo de redacción exactamente:\n${planTemplate.examples.map((e) => `• ${e}`).join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  return `QUINCENA ${fortnight.number}: ${projectName}
Nivel: Kinder 3 (5-6 años) | ${startStr} – ${endStr}
Valor del mes: ${monthlyValue}
Letras: Semana 1="${letterWeek1}" | Semana 2="${letterWeek2}"${vocabList ? `\nVocabulario: ${vocabList}` : ''}
Período de inglés: ${periodMinutes} min.

HORARIO FIJO (INVIOLABLE):
${cap(letterDay)} → Letter & Number (letra de la semana)
${cap(numDay)} → Números
Los demás días: Proyecto mensual, Honores, Ed. Física, Cantos y Juegos y Cuento con papás según el horario del grupo

PRESENTES TODOS LOS DÍAS: Valor del mes (${monthlyValue}), pausa activa, aventura lectora, estrategia comunitaria.

${materialsSection}
${neeSection}
${obsSection ? obsSection + '\n' : ''}${proniSection ? proniSection + '\n' : ''}${richmondSection ? richmondSection + '\n' : ''}${templateSection ? templateSection + '\n' : ''}
Genera exactamente 10 días de planeaciones. Responde ÚNICAMENTE con un objeto JSON con clave "days" que contiene el array (sin markdown, sin texto adicional):

{"days": [
  {
    "day_number": 1,
    "methodology": "project_based",
    "blocks": [
      {
        "label": "Nombre exacto del bloque según formato de la escuela (omitir si no hay formato)",
        "time": "9:00-9:30",
        "activity": "Descripción concreta de la actividad (máx 80 caracteres)",
        "methodology": "play_based",
        "materials": ["material1", "material2"],
        "nem_field": "Lenguajes",
        "nem_axis": "Lectura y escritura"
      }
    ],
    "vocabulary": ["word1", "word2"],
    "observation_students": [],
    "nee_reminders": []
  }
]}

REGLAS:
- Letter & Number SOLO ${cap(letterDay)} | Números SOLO ${cap(numDay)}
- 4-5 bloques por día | Máx 80 caracteres por actividad | Máx 3 materiales por bloque
- Campos Formativos válidos: ${NEM_FIELDS.join(' | ')}
- Ejes Articuladores válidos: ${NEM_AXES.join(' | ')}
- Evaluación cualitativa únicamente: Logrado / En proceso / Requiere apoyo
- Generar exactamente 10 objetos numerados del 1 al 10`
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
