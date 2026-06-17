import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

const VocabularyCreateSchema = z.object({
  word: z.string().min(1).max(50),
  letter: z.string().length(1),
  color: z.enum(['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange']).optional(),
})

const VocabularyBulkSchema = z.object({
  items: z.array(VocabularyCreateSchema),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - relaxed tier (100/hour for read operations)
    const { success, headers } = await checkRateLimit(user.id, 'relaxed')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Each teacher owns their vocabulary — seeded from system words on signup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vocabulary } = await (supabase as any)
      .from('vocabulary_items')
      .select('*')
      .eq('teacher_id', teacher.id)
      .order('letter', { ascending: true })
      .order('word', { ascending: true })

    return NextResponse.json({ vocabulary: vocabulary || [] })
  } catch (error) {
    console.error('Vocabulary GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - standard tier (50/hour for write operations)
    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // Get teacher ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Check if bulk or single
    if (body.items && Array.isArray(body.items)) {
      // Bulk insert
      const input = VocabularyBulkSchema.parse(body)

      const insertData = input.items.map((item) => ({
        word: item.word.toLowerCase().trim(),
        letter: item.letter.toUpperCase(),
        color: item.color || 'blue',
        teacher_id: teacher.id,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vocabulary_items')
        .insert(insertData)
        .select()

      if (error) {
        console.error('Bulk insert error:', error)
        return NextResponse.json({ error: 'Failed to create vocabulary items' }, { status: 500 })
      }

      return NextResponse.json({ vocabulary: data, count: data.length })
    } else {
      // Single insert
      const input = VocabularyCreateSchema.parse(body)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vocabulary_items')
        .insert({
          word: input.word.toLowerCase().trim(),
          letter: input.letter.toUpperCase(),
          color: input.color || 'blue',
          teacher_id: teacher.id,
        })
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        return NextResponse.json({ error: 'Failed to create vocabulary item' }, { status: 500 })
      }

      return NextResponse.json({ vocabulary: data })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Vocabulary POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const schema = z.object({
      id: z.string().uuid(),
      word: z.string().min(1).max(100).optional(),
      letter: z.string().length(1).toUpperCase().optional(),
      color: z.string().optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }
    const { id, ...updates } = parsed.data

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

    const patch: Record<string, string> = {}
    if (updates.word) patch.word = updates.word.toLowerCase()
    if (updates.letter) patch.letter = updates.letter.toUpperCase()
    if (updates.color) patch.color = updates.color

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('vocabulary_items')
      .update(patch)
      .eq('id', id)
      .eq('teacher_id', teacher.id)
      .select()
      .single()

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 500
      return NextResponse.json({ error: 'No se pudo actualizar la palabra' }, { status })
    }
    if (!data) return NextResponse.json({ error: 'Palabra no encontrada' }, { status: 404 })

    return NextResponse.json({ item: data })
  } catch (error) {
    console.error('Vocabulary PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing vocabulary ID' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - standard tier (50/hour for delete operations)
    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // Get teacher ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Check if it's a system word (teacher_id is null) or teacher-owned
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: word } = await (supabase as any)
      .from('vocabulary_items')
      .select('id, teacher_id')
      .eq('id', id)
      .single()

    if (!word) {
      return NextResponse.json({ error: 'Vocabulary item not found' }, { status: 404 })
    }

    if (word.teacher_id === null) {
      // System word — hide it for this teacher by adding to excluded list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacherRecord } = await (supabase as any)
        .from('teachers')
        .select('excluded_vocabulary_ids')
        .eq('id', teacher.id)
        .single()

      const current: string[] = teacherRecord?.excluded_vocabulary_ids ?? []
      if (!current.includes(id)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('teachers')
          .update({ excluded_vocabulary_ids: [...current, id] })
          .eq('id', teacher.id)
        if (error) {
          console.error('Exclude error:', error)
          return NextResponse.json({ error: 'Failed to hide vocabulary item' }, { status: 500 })
        }
      }
    } else if (word.teacher_id === teacher.id) {
      // Teacher-owned word — delete it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('vocabulary_items')
        .delete()
        .eq('id', id)
        .eq('teacher_id', teacher.id)

      if (error) {
        console.error('Delete error:', error)
        return NextResponse.json({ error: 'Failed to delete vocabulary item' }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Audit log - vocabulary deletion
    await logAudit({
      teacher_id: teacher.id,
      action: 'vocabulary.delete',
      resource_type: 'vocabulary_item',
      resource_id: id,
      metadata: {},
      req,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vocabulary DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
