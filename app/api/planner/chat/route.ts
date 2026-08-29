import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { normalizePlanDocument } from '@/lib/planner/normalize-document'
import { storePlaneacionEmbedding, planEmbeddingText } from '@/lib/planner/embeddings'
import {
  CHAT_SYSTEM,
  CHAT_TOOLS,
  EDIT_TOOL,
  ADD_TOOL,
  REMOVE_TOOL,
  CHAT_EDITABLE_SECTIONS,
  SECTION_LABELS,
  buildPlanContext,
  trimTurns,
  type ChatTurn,
} from '@/lib/planner/chat'
import {
  addCustomSection,
  removeCustomSection,
  findCustomSection,
  listCustomSections,
} from '@/lib/planner/custom-sections'

export const maxDuration = 120

const Schema = z.object({
  fortnight_id: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-5'

const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    const { fortnight_id, message } = body.data

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // AI call → strict tier, same cost class as regenerate-section.
    const { success } = await checkRateLimit(user.id, 'strict', 'planner-chat')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: teacher } = await db
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()
    if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: fn } = await db
      .from('fortnights')
      .select('id, teacher_id, project_name, plan_document')
      .eq('id', fortnight_id)
      .maybeSingle()
    if (!fn || fn.teacher_id !== teacher.id || !fn.plan_document) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const { data: history } = await db
      .from('plan_chat_messages')
      .select('role, content')
      .eq('fortnight_id', fortnight_id)
      .eq('teacher_id', teacher.id)
      .order('created_at', { ascending: true })

    // Persist the teacher's turn immediately — if the model call dies, her message survives.
    await db.from('plan_chat_messages').insert({
      teacher_id: teacher.id,
      fortnight_id,
      role: 'user',
      content: message,
    })

    const turns = trimTurns([
      ...((history ?? []) as ChatTurn[]),
      { role: 'user' as const, content: message },
    ])

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (o: unknown) => controller.enqueue(encoder.encode(sse(o)))
        let reply = ''
        const edited: string[] = []
        // plan_document as it was before this turn's first write — powers undo.
        let snapshot: Record<string, unknown> | null = null

        try {
          // plan_document is re-read into this local as edits land, so a second tool
          // call in the same turn sees the first one's result.
          let planDoc = fn.plan_document as Record<string, unknown>

          const messages: Anthropic.MessageParam[] = [
            { role: 'user', content: `${buildPlanContext(planDoc)}\n\n${turns[0]?.content ?? ''}` },
            ...turns.slice(1).map((t) => ({ role: t.role, content: t.content })),
          ]

          // Agentic loop: the model may edit several sections before its final reply.
          // Bounded so a misbehaving turn can't spin.
          for (let step = 0; step < 6; step++) {
            const res = await anthropic.messages.create({
              model: MODEL,
              max_tokens: 8000,
              system: CHAT_SYSTEM,
              tools: CHAT_TOOLS,
              messages,
            })

            for (const block of res.content) {
              if (block.type === 'text' && block.text) {
                reply += block.text
                send({ delta: block.text })
              }
            }

            const toolUses = res.content.filter((b) => b.type === 'tool_use')
            if (!toolUses.length) break

            const results: Anthropic.ToolResultBlockParam[] = []
            for (const tu of toolUses) {
              const input = tu.input as {
                seccion?: string
                contenido?: string
                titulo?: string
              }
              const fail = (msg: string) =>
                results.push({
                  type: 'tool_result',
                  tool_use_id: tu.id,
                  is_error: true,
                  content: msg,
                })

              let next: Record<string, unknown> | null = null
              let label = ''
              let correction: { section: string; original: string; edited: string } | null = null

              if (tu.name === EDIT_TOOL.name) {
                const key = input?.seccion ?? ''
                const value = (input?.contenido ?? '').trim()
                if (!CHAT_EDITABLE_SECTIONS.has(key) || !value) {
                  fail('Sección no editable o contenido vacío.')
                  continue
                }
                next = { ...planDoc, [key]: value }
                label = SECTION_LABELS[key] ?? key
                correction = {
                  section: `chat:${key}`,
                  original: String(planDoc[key] ?? ''),
                  edited: value,
                }
              } else if (tu.name === ADD_TOOL.name) {
                const title = (input?.titulo ?? '').trim()
                const value = (input?.contenido ?? '').trim()
                if (!title || !value) {
                  fail('Falta el título o el contenido de la sección.')
                  continue
                }
                if (findCustomSection(planDoc, title) !== -1) {
                  fail(
                    `Ya existe una sección propia llamada "${title}". Edítala en vez de crearla.`
                  )
                  continue
                }
                // Keeps custom_sections and _section_order in sync — a section added
                // to one but not the other never renders.
                next = addCustomSection(planDoc, { title, content: value })
                label = title
                correction = { section: `chat:add`, original: '', edited: value }
              } else if (tu.name === REMOVE_TOOL.name) {
                const title = (input?.titulo ?? '').trim()
                const idx = findCustomSection(planDoc, title)
                if (idx === -1) {
                  const existing = listCustomSections(planDoc)
                  fail(
                    existing.length
                      ? `No hay una sección propia llamada "${title}". Las que existen son: ${existing.join(', ')}.`
                      : 'Esta planeación no tiene secciones propias. Las secciones estándar no se pueden eliminar.'
                  )
                  continue
                }
                const removed = (planDoc.custom_sections as { content?: string }[])[idx]
                // Re-indexes the remaining 'custom:N' entries in _section_order.
                next = removeCustomSection(planDoc, idx)
                label = title
                correction = {
                  section: `chat:remove`,
                  original: String(removed?.content ?? ''),
                  edited: '',
                }
              } else {
                fail('Herramienta desconocida.')
                continue
              }

              // First write of the turn: snapshot the document so this turn is undoable.
              if (!snapshot) snapshot = planDoc

              planDoc = normalizePlanDocument(next)
              const { error } = await db
                .from('fortnights')
                .update({ plan_document: planDoc })
                .eq('id', fortnight_id)
              if (error) throw error

              // Same learning capture as regenerate-section. 'chat:' prefixed for the
              // same reason 'regen:' is — this is AI prose, not the teacher's own
              // voice, so the distiller must not treat it as a writing sample.
              if (correction) {
                await db
                  .from('plan_corrections')
                  .insert({
                    teacher_id: teacher.id,
                    fortnight_id,
                    section: correction.section,
                    original: correction.original.slice(0, 6000),
                    edited: correction.edited.slice(0, 6000),
                  })
                  .then(
                    ({ error: e }: { error: unknown }) =>
                      e && console.error('[planner-chat] correction capture skipped:', e)
                  )
              }

              if (!edited.includes(label)) edited.push(label)
              send({ edited: label, label })
              results.push({
                type: 'tool_result',
                tool_use_id: tu.id,
                content: 'Documento actualizado.',
              })
            }

            messages.push({ role: 'assistant', content: res.content })
            messages.push({ role: 'user', content: results })
          }

          if (edited.length) {
            await storePlaneacionEmbedding(supabase, {
              fortnightId: fortnight_id,
              teacherId: teacher.id,
              projectName: String(fn.project_name ?? ''),
              content: planEmbeddingText(planDoc),
            })
          }

          const finalReply = reply.trim() || 'Listo.'
          await db.from('plan_chat_messages').insert({
            teacher_id: teacher.id,
            fortnight_id,
            role: 'assistant',
            content: finalReply.slice(0, 20000),
            edited_sections: edited,
            plan_snapshot: snapshot,
          })

          send({ done: true, edited })
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          console.error('[planner-chat]', err)
          send({ error: 'No pude completar el cambio. Intenta de nuevo.' })
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
  } catch (err) {
    console.error('[planner-chat]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** Conversation history for the panel. */
export async function GET(req: NextRequest) {
  const fortnightId = req.nextUrl.searchParams.get('fortnight_id')
  if (!fortnightId) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('plan_chat_messages')
    // plan_snapshot itself is a whole document — send only whether one exists,
    // so the client can show the undo affordance without downloading the plan twice.
    .select('id, role, content, edited_sections, created_at, undone_at, plan_snapshot')
    .eq('fortnight_id', fortnightId)
    .order('created_at', { ascending: true })

  // RLS scopes this to the owning teacher — no extra ownership check needed.
  const messages = (
    (data ?? []) as {
      id: string
      role: string
      content: string
      edited_sections: string[] | null
      created_at: string
      undone_at: string | null
      plan_snapshot: unknown
    }[]
  ).map(({ plan_snapshot, ...m }) => ({ ...m, can_undo: !!plan_snapshot && !m.undone_at }))

  return NextResponse.json({ messages })
}
