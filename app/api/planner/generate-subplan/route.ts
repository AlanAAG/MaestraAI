import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 90

const Schema = z.object({
  fortnight_id: z.string().uuid(),
  sub_type: z.enum(['letter_number', 'numeros']),
})

const SUBPLAN_SYSTEM = `Eres una asistente pedagógica experta en educación preescolar mexicana alineada al NEM 2024. Generas sub-planeaciones para actividades específicas dentro de una quincena. Tu respuesta es ÚNICAMENTE un objeto JSON válido sin texto adicional.`

async function callModel(system: string, user: string): Promise<string> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      })
      return resp.choices[0]?.message?.content ?? ''
    } catch {
      /* fall through */
    }
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    temperature: 0.3,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const c = resp.content[0]
  if (c.type !== 'text') throw new Error('Unexpected response type')
  return c.text
}

function buildSubplanPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  subType: 'letter_number' | 'numeros',
  vocabList: string,
  letterDay: string,
  numDay: string
): string {
  const sanitize = (s: string | null | undefined) => (s || '').replace(/[\r\n]/g, ' ').slice(0, 200)
  const projectName = sanitize(fn.project_name)
  const monthlyValue = sanitize(fn.monthly_value)

  if (subType === 'letter_number') {
    const letter1 = sanitize(fn.letter_week1)
    const letter2 = sanitize(fn.letter_week2)
    return `Genera un sub-plan de LETTER & NUMBER (para los ${letterDay}) dentro del proyecto "${projectName}" (valor: ${monthlyValue}).
Letras a trabajar: Semana 1="${letter1}", Semana 2="${letter2}"${vocabList ? `\nVocabulario inglés relacionado: ${vocabList}` : ''}

Formato de salida JSON:
{
  "tipo": "letter_number",
  "metodologia": "Centro de Interés",
  "nombre": "Nombre descriptivo de la actividad con las letras",
  "campos_formativos": [{"campo": "Lenguajes", "contenidos": [{"contenido": "texto NEM", "procesos": ["PDA 1"]}]}],
  "estructura_didactica": {
    "momento_1": "markdown — En contacto con la realidad: cómo se presenta la letra, qué conocimientos previos activan",
    "momento_2": "markdown — Identificación e integración: actividades de trazo, canciones, sopas de letras, tarjetas, plastilina, flashcards",
    "momento_3": "markdown — Expresión: cómo cierran y comparten lo aprendido"
  },
  "evaluacion": [{"aspecto": "Escribe la letra Xx"}, {"aspecto": "Reconoce la letra Xx"}]
}

Reglas: Letter & Number es SOLO los ${letterDay}. Los 3 momentos deben tener actividades concretas y detalladas.`
  } else {
    return `Genera un sub-plan de NÚMEROS (para los ${numDay}) dentro del proyecto "${projectName}" (valor: ${monthlyValue}).

Formato de salida JSON:
{
  "tipo": "numeros",
  "metodologia": "Centro de Interés",
  "nombre": "Nombre descriptivo del rango numérico que se trabaja",
  "campos_formativos": [{"campo": "Saberes y Pensamiento Científico", "contenidos": [{"contenido": "texto NEM", "procesos": ["PDA 1"]}]}],
  "estructura_didactica": {
    "momento_1": "markdown — En contacto con la realidad: introducción al rango numérico, conocimientos previos",
    "momento_2": "markdown — Identificación e integración: tarjetas, conteo, vasos, pizarrón, plastilina, inglés",
    "momento_3": "markdown — Expresión: cierre con canción o modelado de los números"
  },
  "evaluacion": [{"aspecto": "Reconoce los números del rango trabajado"}, {"aspecto": "Traza los números"}]
}

Reglas: Números es SOLO los ${numDay}. Los 3 momentos deben tener actividades variadas y concretas.`
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fn } = await (supabase as any)
      .from('fortnights')
      .select(
        'id, teacher_id, project_name, monthly_value, letter_week1, letter_week2, vocabulary, group_id, plan_document, groups(fixed_weekly_schedule)'
      )
      .eq('id', body.data.fortnight_id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!fn || (fn as any).teacher_id !== (teacher as any).id) {
      return NextResponse.json({ error: 'Fortnight not found' }, { status: 404 })
    }

    const vocabList = Array.isArray(fn.vocabulary) ? (fn.vocabulary as string[]).join(', ') : ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sched = (fn as any).groups?.fixed_weekly_schedule
    const letterDay: string = sched?.letter_number_day ?? 'martes'
    const numDay: string = sched?.numeros_day ?? 'jueves'
    const prompt = buildSubplanPrompt(fn, body.data.sub_type, vocabList, letterDay, numDay)

    const raw = await callModel(SUBPLAN_SYSTEM, prompt)
    let subplan: Record<string, unknown>
    try {
      subplan = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    } catch {
      return NextResponse.json({ error: 'Respuesta inválida del modelo' }, { status: 500 })
    }

    // Append to plan_document.sub_planes (or create plan_document if it doesn't exist)
    const existing = (fn.plan_document ?? {}) as Record<string, unknown>
    const subPlanes = (Array.isArray(existing.sub_planes) ? existing.sub_planes : []) as unknown[]
    // Replace if same tipo already exists
    const filtered = subPlanes.filter(
      (s) => (s as Record<string, unknown>).tipo !== body.data.sub_type
    )
    const updated = { ...existing, sub_planes: [...filtered, subplan] }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: saveErr } = await (supabase as any)
      .from('fortnights')
      .update({ plan_document: updated })
      .eq('id', fn.id)
    if (saveErr) throw saveErr

    return NextResponse.json({ sub_plan: subplan })
  } catch (err) {
    console.error('[generate-subplan]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
