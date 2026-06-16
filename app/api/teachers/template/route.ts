import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const Schema = z.object({
  template_text: z.string().min(50).max(5000),
})

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Analiza este formato de planeación escolar y extrae su estructura. Responde ÚNICAMENTE con JSON válido, sin texto adicional:

{"sections":["sección 1","sección 2"],"notes":"estilo y convenciones breves (máx 100 chars)"}

Formato de planeación:
---
${body.data.template_text}
---`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    let parsed: { sections?: string[]; notes?: string }
    try {
      parsed = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    } catch {
      return NextResponse.json(
        { error: 'No pude analizar el formato. Intenta con más texto.' },
        { status: 422 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('teachers')
      .update({ plan_template: parsed })
      .eq('id', teacher.id)
    if (error) throw error

    return NextResponse.json({ plan_template: parsed })
  } catch (err) {
    console.error('POST /api/teachers/template error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
