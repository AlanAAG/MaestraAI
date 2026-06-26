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
  PageOrientation,
  ImageRun,
  BorderStyle,
} from 'docx'

// Design preferences → docx values.
const DOCX_FONT: Record<string, string> = {
  sans: 'Calibri',
  serif: 'Georgia',
  rounded: 'Comic Sans MS',
}
const DOCX_BORDER: Record<string, string> = {
  light: 'E5E7EB',
  medium: 'D1D5DB',
  strong: '9CA3AF',
}
function tableBorders(color: string) {
  const b = { style: BorderStyle.SINGLE, size: 4, color }
  return { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b }
}

const Schema = z.object({
  fortnight_id: z.string().uuid(),
  orientation: z.enum(['vertical', 'horizontal']).optional(),
})

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
  observaciones?: string
}

type PlanDocument = {
  tipo?: string
  nombre_proyecto?: string
  metodologia?: string
  actividades_iniciales?: string
  actividades_rutina?: string
  aventura_lectora?: string
  estrategia_comunitaria?: string
  pausas_activas?: string
  ajustes_razonables?: string
  ejes_articuladores?: string
  proyecto?: string
  desarrollo_taller?: string
  cronograma?: Record<string, string[]>
  campos_formativos?: CampoFormativo[]
  evaluacion_items?: { aspecto: string }[]
  evaluation_columns?: string[]
  custom_sections?: Array<{ title: string; content: string }>
  sub_planes?: SubPlan[]
  _section_order?: string[]
  _section_titles?: Record<string, string>
}

// Convert a simple markdown string to docx Paragraph array (handles bullets, bold, blank lines)
function mdToParas(text: unknown, heading?: string): Paragraph[] {
  const paras: Paragraph[] = []
  if (heading) {
    paras.push(new Paragraph({ text: heading, heading: HeadingLevel.HEADING_2 }))
  }
  // Sections are normally markdown strings, but a malformed plan_document can hand us an
  // object/array — coerce instead of letting `.split` throw and 500 the whole export.
  const str =
    typeof text === 'string'
      ? text
      : text == null
        ? ''
        : Array.isArray(text)
          ? text.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n')
          : JSON.stringify(text, null, 2)
  if (!str) return paras
  let prevWasBlank = false
  for (const line of str.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      // Preserve blank lines as paragraph breaks (one per consecutive run)
      if (!prevWasBlank) paras.push(new Paragraph(''))
      prevWasBlank = true
      continue
    }
    prevWasBlank = false
    // Skip markdown heading markers (## / ###) — render as bold paragraph instead
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/)
    if (headingMatch) {
      paras.push(new Paragraph({ children: [new TextRun({ text: headingMatch[1], bold: true })] }))
      continue
    }
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

// Default title map — mirrors DEFAULT_TITLES in the viewer
const DEFAULT_SECTION_TITLES: Record<string, string> = {
  actividades_iniciales: 'Actividades Iniciales',
  actividades_rutina: 'Actividades de Rutina y Permanentes',
  aventura_lectora: 'Aventura Lectora',
  estrategia_comunitaria: 'Estrategias Comunitarias para Espacios Libres de Violencia',
  pausas_activas: 'Pausas Activas',
  ajustes_razonables: 'Ajustes Razonables',
  ejes_articuladores: 'Ejes Articuladores',
  campos_formativos: 'Campos Formativos',
  proyecto: 'Del Proyecto',
  cronograma: 'Cronograma de Actividades Diarias',
  evaluacion_items: 'Evaluación de Aprendizajes',
  desarrollo_taller: 'Desarrollo del Taller',
}

const DEFAULT_QUINCENA_ORDER = [
  'actividades_iniciales',
  'actividades_rutina',
  'aventura_lectora',
  'estrategia_comunitaria',
  'pausas_activas',
  'ajustes_razonables',
  'cronograma',
  'ejes_articuladores',
  'campos_formativos',
  'proyecto',
  'evaluacion_items',
]

function cronogramaTable(cronograma: Record<string, string[]>, borderColor: string): Table {
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
    borders: tableBorders(borderColor),
  })
}

function camposFormativosSection(
  campos: CampoFormativo[],
  borderColor: string
): (Paragraph | Table)[] {
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
      ...(cf.contenidos ?? []).map(
        (c) =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph(c.contenido ?? '')],
                width: { size: 40, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: (c.procesos ?? []).map((p) => new Paragraph({ text: `• ${p}` })),
                width: { size: 60, type: WidthType.PERCENTAGE },
              }),
            ],
          })
      ),
    ]
    items.push(
      new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders(borderColor),
      })
    )
    items.push(new Paragraph(''))
  }
  return items
}

function evaluacionTable(
  items: { aspecto: string }[],
  borderColor: string,
  columns?: string[]
): Table {
  const cols = columns?.length ? columns : ['Logrado', 'En proceso', 'Requiere apoyo']
  const headerRow = new TableRow({
    children: ['Aspecto', ...cols].map(
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
          ...cols.map(() => new TableCell({ children: [new Paragraph('')] })),
        ],
      })
  )
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(borderColor),
  })
}

function observationCalendarTable(cal: Record<string, string[]>, borderColor: string): Table {
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
    borders: tableBorders(borderColor),
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
      .select('id, school_id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // School logo (base64 data URL) for the document header — best-effort.
    let logoDataUrl: string | null = null
    if (teacher.school_id) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: school } = await (supabase as any)
          .from('schools')
          .select('logo_url')
          .eq('id', teacher.school_id)
          .single()
        logoDataUrl = (school?.logo_url as string) ?? null
      } catch {
        /* column may not exist yet */
      }
    }

    // Teacher design preferences (font, size, accent, line intensity) — best-effort.
    let design = { font: 'sans', size: 16, accent: '#1f2937', lineIntensity: 'medium' }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dRow } = await (supabase as any)
        .from('teachers')
        .select('design_settings')
        .eq('id', teacher.id)
        .single()
      if (dRow?.design_settings) design = { ...design, ...dRow.design_settings }
    } catch {
      /* column may not exist yet */
    }
    const docFont = DOCX_FONT[design.font] ?? 'Calibri'
    const docSize = Math.round(design.size * 1.375) // px → half-points (16px ≈ 22 ≈ 11pt)
    const accentHex = (design.accent || '#1f2937').replace('#', '').toUpperCase()
    const borderHex = DOCX_BORDER[design.lineIntensity] ?? 'D1D5DB'

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

    // School logo (centered, above the title)
    const logoMatch = logoDataUrl?.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/)
    if (logoMatch) {
      const fmt = logoMatch[1] === 'jpg' ? 'jpeg' : logoMatch[1]
      try {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                // @ts-expect-error docx type union accepts these string formats at runtime
                type: fmt === 'jpeg' ? 'jpg' : fmt,
                data: Buffer.from(logoMatch[2], 'base64'),
                transformation: { width: 90, height: 90 },
              }),
            ],
          })
        )
      } catch {
        /* skip a malformed logo rather than fail the export */
      }
    }

    // Title
    children.push(
      new Paragraph({
        text: `Planeación ${pd.tipo === 'taller' ? 'Taller' : 'Quincena ' + fn.number}: ${pd.nombre_proyecto ?? fn.project_name ?? ''}`,
        heading: HeadingLevel.HEADING_1,
      })
    )
    children.push(
      new Paragraph({
        text: `Grado: ${fn.groups?.grade ?? ''} | Metodología: ${pd.metodologia ?? ''}`,
      })
    )
    children.push(new Paragraph(''))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obsCal = (fn as any).observation_calendar as Record<string, string[]> | null
    const userTitles = pd._section_titles ?? {}
    const t = (key: string) => userTitles[key] ?? DEFAULT_SECTION_TITLES[key] ?? key

    const appendSection = (key: string) => {
      try {
        if (key.startsWith('custom:')) {
          const idx = parseInt(key.slice(7), 10)
          if (isNaN(idx)) return
          const cs = pd.custom_sections?.[idx]
          if (cs?.title && cs?.content) {
            children.push(new Paragraph({ text: cs.title, heading: HeadingLevel.HEADING_2 }))
            children.push(...mdToParas(cs.content))
            children.push(new Paragraph(''))
          }
          return
        }
        switch (key) {
          case 'actividades_iniciales':
            if (pd.actividades_iniciales)
              children.push(...mdToParas(pd.actividades_iniciales, t(key)))
            break
          case 'actividades_rutina':
            if (pd.actividades_rutina) children.push(...mdToParas(pd.actividades_rutina, t(key)))
            break
          case 'aventura_lectora':
            if (pd.aventura_lectora) children.push(...mdToParas(pd.aventura_lectora, t(key)))
            break
          case 'estrategia_comunitaria':
            if (pd.estrategia_comunitaria)
              children.push(...mdToParas(pd.estrategia_comunitaria, t(key)))
            break
          case 'pausas_activas':
            if (pd.pausas_activas) children.push(...mdToParas(pd.pausas_activas, t(key)))
            break
          case 'ajustes_razonables':
            if (pd.ajustes_razonables) children.push(...mdToParas(pd.ajustes_razonables, t(key)))
            break
          case 'ejes_articuladores':
            if (pd.ejes_articuladores) children.push(...mdToParas(pd.ejes_articuladores, t(key)))
            break
          case 'campos_formativos':
            if (pd.campos_formativos?.length)
              children.push(...camposFormativosSection(pd.campos_formativos, borderHex))
            break
          case 'proyecto':
            if (pd.proyecto) children.push(...mdToParas(pd.proyecto, t(key)))
            break
          case 'desarrollo_taller':
            if (pd.desarrollo_taller) children.push(...mdToParas(pd.desarrollo_taller, t(key)))
            break
          case 'cronograma':
            if (pd.cronograma) {
              children.push(new Paragraph({ text: t(key), heading: HeadingLevel.HEADING_2 }))
              children.push(cronogramaTable(pd.cronograma, borderHex))
              children.push(new Paragraph(''))
            }
            if (obsCal && Object.values(obsCal).some((v) => v?.length)) {
              children.push(
                new Paragraph({
                  text: 'Calendario de Observación de Alumnos',
                  heading: HeadingLevel.HEADING_2,
                })
              )
              children.push(observationCalendarTable(obsCal, borderHex))
              children.push(new Paragraph(''))
            }
            break
          case 'evaluacion_items':
            if (pd.evaluacion_items?.length) {
              children.push(new Paragraph({ text: t(key), heading: HeadingLevel.HEADING_2 }))
              children.push(evaluacionTable(pd.evaluacion_items, borderHex, pd.evaluation_columns))
              children.push(new Paragraph(''))
            }
            break
        }
      } catch (e) {
        // One malformed section must not 500 the entire export — skip it, keep the rest.
        console.error('[export-docx] section render failed:', key, e)
      }
    }

    if (pd.tipo === 'quincena') {
      // Respect teacher's section order if stored, otherwise canonical default.
      const order = [...(pd._section_order ?? DEFAULT_QUINCENA_ORDER)]
      const covered = new Set(order)
      for (const key of DEFAULT_QUINCENA_ORDER) {
        if (!covered.has(key)) order.push(key)
      }
      // Mirror the viewer: project description renders first, right under the title.
      const pIdx = order.indexOf('proyecto')
      if (pIdx > 0) {
        order.splice(pIdx, 1)
        order.unshift('proyecto')
      }
      for (const key of order) appendSection(key)
    } else {
      // Taller: fixed order (teacher order not yet tracked for taller plans)
      for (const key of [
        'ajustes_razonables',
        'desarrollo_taller',
        'actividades_iniciales',
        'actividades_rutina',
        'aventura_lectora',
        'pausas_activas',
        'cronograma',
        'evaluacion_items',
      ] as const) {
        appendSection(key)
      }
      // taller custom sections appended after evaluacion
      for (let i = 0; i < (pd.custom_sections?.length ?? 0); i++) {
        appendSection(`custom:${i}`)
      }
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
        children.push(...camposFormativosSection(sp.campos_formativos, borderHex))
      }
      if (sp.estructura_didactica) {
        for (const [key, val] of Object.entries(sp.estructura_didactica)) {
          children.push(...mdToParas(val as string, `${key.replace('momento_', '')}° Momento`))
        }
      }
      if (sp.evaluacion?.length) {
        children.push(evaluacionTable(sp.evaluacion, borderHex, pd.evaluation_columns))
      }
      if (sp.observaciones) children.push(...mdToParas(sp.observaciones, 'Observaciones y ajustes'))
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
      sections: [
        {
          // Landscape must swap the page dimensions, not just set the flag — otherwise the
          // page stays portrait-sized (the "horizontal/vertical looks the same" bug). Letter size.
          properties:
            body.data.orientation === 'horizontal'
              ? {
                  page: {
                    size: { orientation: PageOrientation.LANDSCAPE, width: 15840, height: 12240 },
                  },
                }
              : {
                  page: {
                    size: { orientation: PageOrientation.PORTRAIT, width: 12240, height: 15840 },
                  },
                },
          children,
        },
      ],
      styles: {
        paragraphStyles: [
          { id: 'Normal', run: { font: docFont, size: docSize } },
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            run: { font: docFont, size: docSize + 10, bold: true, color: accentHex },
            paragraph: { spacing: { before: 240, after: 120 } },
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            run: { font: docFont, size: docSize + 4, bold: true, color: accentHex },
            paragraph: { spacing: { before: 200, after: 80 } },
          },
        ],
      },
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
    // Surface the real reason to the client (teacher's own export — no sensitive data in the message).
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
