import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  Packer,
  TextRun,
  WidthType,
  ShadingType,
  AlignmentType,
} from 'docx'

const Schema = z.object({ fortnight_id: z.string().uuid() })

type CampoFormativo = {
  campo: string
  contenidos: { contenido: string; procesos: string[] }[]
}

type SubPlan = {
  tipo: string
  metodologia?: string
  nombre?: string
  campos_formativos?: CampoFormativo[]
  estructura_didactica?: Record<string, string>
  evaluacion?: { aspecto: string }[]
}

type PlanDocument = {
  tipo?: string
  nombre_proyecto?: string
  metodologia?: string
  actividades_iniciales?: string
  actividades_rutina?: string
  estrategia_comunitaria?: string
  pausas_activas?: string
  ajustes_razonables?: string
  ejes_articuladores?: string
  proyecto?: string
  desarrollo_taller?: string
  cronograma?: Record<string, string[]>
  campos_formativos?: CampoFormativo[]
  evaluacion_items?: { aspecto: string }[]
  sub_planes?: SubPlan[]
}

// Convert a simple markdown string to docx Paragraph array (handles bullets and bold)
function mdToParas(text: string, heading?: string): Paragraph[] {
  const paras: Paragraph[] = []
  if (heading) {
    paras.push(new Paragraph({ text: heading, heading: HeadingLevel.HEADING_2 }))
  }
  if (!text) return paras
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const isBullet =
      trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')
    const content = isBullet ? trimmed.slice(2) : trimmed
    // Parse **bold** inline
    const runs: TextRun[] = []
    const parts = content.split(/(\*\*[^*]+\*\*)/)
    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
      } else if (part) {
        runs.push(new TextRun(part))
      }
    }
    paras.push(new Paragraph({ children: runs, bullet: isBullet ? { level: 0 } : undefined }))
  }
  return paras
}

function cronogramaTable(cronograma: Record<string, string[]>): Table {
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
  const headers = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const maxRows = Math.max(...days.map((d) => (cronograma[d] ?? []).length))

  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { type: ShadingType.SOLID, color: 'E8EAF6' },
          width: { size: 20, type: WidthType.PERCENTAGE },
        })
    ),
  })

  const dataRows: TableRow[] = []
  for (let i = 0; i < maxRows; i++) {
    dataRows.push(
      new TableRow({
        children: days.map(
          (d) =>
            new TableCell({
              children: [new Paragraph(cronograma[d]?.[i] ?? '')],
              width: { size: 20, type: WidthType.PERCENTAGE },
            })
        ),
      })
    )
  }

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function camposFormativosSection(campos: CampoFormativo[]): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = []
  items.push(new Paragraph({ text: 'Campos Formativos', heading: HeadingLevel.HEADING_2 }))
  for (const cf of campos) {
    items.push(new Paragraph({ children: [new TextRun({ text: cf.campo, bold: true, size: 24 })] }))
    const rows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Contenidos', bold: true })] }),
            ],
            shading: { type: ShadingType.SOLID, color: 'E8EAF6' },
            width: { size: 40, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Procesos de Desarrollo de Aprendizaje', bold: true }),
                ],
              }),
            ],
            shading: { type: ShadingType.SOLID, color: 'E8EAF6' },
            width: { size: 60, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      ...cf.contenidos.map(
        (c) =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph(c.contenido)],
                width: { size: 40, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: c.procesos.map((p) => new Paragraph({ text: `• ${p}` })),
                width: { size: 60, type: WidthType.PERCENTAGE },
              }),
            ],
          })
      ),
    ]
    items.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }))
    items.push(new Paragraph(''))
  }
  return items
}

function evaluacionTable(items: { aspecto: string }[]): Table {
  const headerRow = new TableRow({
    children: ['Aspecto', 'Logrado', 'En proceso', 'Requiere apoyo'].map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { type: ShadingType.SOLID, color: 'E8EAF6' },
        })
    ),
  })
  const dataRows = items.map(
    (item) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(`• ${item.aspecto}`)] }),
          new TableCell({ children: [new Paragraph('')] }),
          new TableCell({ children: [new Paragraph('')] }),
          new TableCell({ children: [new Paragraph('')] }),
        ],
      })
  )
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function observationCalendarTable(cal: Record<string, string[]>): Table {
  const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
  const labels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const maxRows = Math.max(...days.map((d) => (cal[d] ?? []).length))
  const headerRow = new TableRow({
    children: labels.map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { type: ShadingType.SOLID, color: 'E8EAF6' },
          width: { size: 20, type: WidthType.PERCENTAGE },
        })
    ),
  })
  const dataRows: TableRow[] = Array.from(
    { length: maxRows },
    (_, i) =>
      new TableRow({
        children: days.map(
          (d) =>
            new TableCell({
              children: [new Paragraph(cal[d]?.[i] ?? '')],
              width: { size: 20, type: WidthType.PERCENTAGE },
            })
        ),
      })
  )
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success } = await checkRateLimit((teacher as { id: string }).id, 'standard')
    if (!success)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429 }
      )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fn } = await (supabase as any)
      .from('fortnights')
      .select(
        'id, teacher_id, project_name, number, plan_document, observation_calendar, groups(name, grade)'
      )
      .eq('id', body.data.fortnight_id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!fn || (fn as any).teacher_id !== (teacher as any).id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const pd = (fn.plan_document ?? {}) as PlanDocument
    if (!pd.tipo)
      return NextResponse.json({ error: 'No hay documento generado aún' }, { status: 422 })

    const children: (Paragraph | Table)[] = []

    // Title
    children.push(
      new Paragraph({
        text: `Planeación ${pd.tipo === 'taller' ? 'Taller' : 'Quincena ' + fn.number}: ${pd.nombre_proyecto ?? fn.project_name ?? ''}`,
        heading: HeadingLevel.HEADING_1,
      })
    )
    children.push(
      new Paragraph({
        text: `Grupo: ${fn.groups?.name ?? ''} | Metodología: ${pd.metodologia ?? ''}`,
      })
    )
    children.push(new Paragraph(''))

    if (pd.tipo === 'quincena') {
      if (pd.actividades_iniciales)
        children.push(...mdToParas(pd.actividades_iniciales, 'Actividades Iniciales'))
      if (pd.actividades_rutina)
        children.push(...mdToParas(pd.actividades_rutina, 'Actividades de Rutina y Permanentes'))
      if (pd.estrategia_comunitaria)
        children.push(...mdToParas(pd.estrategia_comunitaria, 'Estrategia Comunitaria'))
      if (pd.pausas_activas) children.push(...mdToParas(pd.pausas_activas, 'Pausas Activas'))
      if (pd.ajustes_razonables)
        children.push(...mdToParas(pd.ajustes_razonables, 'Ajustes Razonables'))
    } else {
      if (pd.ajustes_razonables)
        children.push(...mdToParas(pd.ajustes_razonables, 'Ajustes Razonables'))
    }

    if (pd.cronograma) {
      children.push(
        new Paragraph({
          text: 'Cronograma de Actividades Diarias',
          heading: HeadingLevel.HEADING_2,
        })
      )
      children.push(cronogramaTable(pd.cronograma))
      children.push(new Paragraph(''))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obsCal = (fn as any).observation_calendar as Record<string, string[]> | null
    if (obsCal && Object.values(obsCal).some((v) => v?.length)) {
      children.push(
        new Paragraph({
          text: 'Calendario de Observación de Alumnos',
          heading: HeadingLevel.HEADING_2,
        })
      )
      children.push(observationCalendarTable(obsCal))
      children.push(new Paragraph(''))
    }

    if (pd.ejes_articuladores)
      children.push(...mdToParas(pd.ejes_articuladores, 'Ejes Articuladores'))

    if (pd.campos_formativos?.length) {
      children.push(...camposFormativosSection(pd.campos_formativos))
    }

    if (pd.tipo === 'quincena' && pd.proyecto) {
      children.push(...mdToParas(pd.proyecto, 'Del Proyecto'))
    }
    if (pd.tipo === 'taller' && pd.desarrollo_taller) {
      children.push(...mdToParas(pd.desarrollo_taller, 'Desarrollo del Taller'))
    }

    if (pd.tipo === 'taller') {
      if (pd.actividades_iniciales)
        children.push(...mdToParas(pd.actividades_iniciales, 'Actividades Iniciales'))
      if (pd.actividades_rutina)
        children.push(...mdToParas(pd.actividades_rutina, 'Actividades de Rutina y Permanentes'))
      if (pd.pausas_activas) children.push(...mdToParas(pd.pausas_activas, 'Pausas Activas'))
    }

    if (pd.evaluacion_items?.length) {
      children.push(
        new Paragraph({ text: 'Evaluación de Aprendizajes', heading: HeadingLevel.HEADING_2 })
      )
      children.push(evaluacionTable(pd.evaluacion_items))
      children.push(new Paragraph(''))
    }

    // Sub-plans
    for (const sp of pd.sub_planes ?? []) {
      children.push(
        new Paragraph({
          text: sp.tipo === 'letter_number' ? 'Letter & Number' : 'Números',
          heading: HeadingLevel.HEADING_2,
        })
      )
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Metodología: ${sp.metodologia ?? ''} — ${sp.nombre ?? ''}`,
              italics: true,
            }),
          ],
        })
      )
      if (sp.campos_formativos?.length) {
        children.push(...camposFormativosSection(sp.campos_formativos))
      }
      if (sp.estructura_didactica) {
        for (const [key, val] of Object.entries(sp.estructura_didactica)) {
          children.push(...mdToParas(val as string, `${key.replace('momento_', '')}° Momento`))
        }
      }
      if (sp.evaluacion?.length) {
        children.push(evaluacionTable(sp.evaluacion))
      }
      children.push(new Paragraph(''))
    }

    // Footer citation
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Programa de Estudio para la Educación Preescolar, Fase 2. SEP, 2024',
            italics: true,
            size: 18,
          }),
        ],
      })
    )

    const doc = new Document({
      sections: [{ children }],
      styles: { paragraphStyles: [{ id: 'Normal', run: { font: 'Calibri', size: 22 } }] },
    })

    const buf = await Packer.toBuffer(doc)

    const filename = `planeacion-${pd.tipo}-${fn.number ?? ''}.docx`
    return new Response(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[export-docx]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
