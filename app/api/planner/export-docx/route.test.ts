// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import JSZip from 'jszip'
import { POST } from './route'

const mocks = vi.hoisted(() => ({ rules: {} as Record<string, unknown> }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success: true }) }))
vi.mock('@/lib/planner/nee-names', () => ({
  decryptNeeMap: async () => ({}),
  applyNeeNames: (text: string) => text,
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({
          data:
            table === 'teachers'
              ? { id: 'teacher', school_id: null }
              : {
                  id: 'plan',
                  teacher_id: 'teacher',
                  project_name: 'Animales',
                  groups: { name: 'Kinder', grade: 'Kinder 2' },
                  plan_document: {
                    tipo: 'quincena',
                    nombre_proyecto: 'Animales',
                    proyecto: '**Compartimos descubrimientos**\nObservaremos los animales.',
                    _formatting_rules: mocks.rules,
                  },
                },
          error: null,
        }),
      }
      return query
    },
  }),
}))

async function exportedPage(orientation?: 'horizontal' | 'vertical') {
  const response = await POST(
    new NextRequest('http://localhost/api/planner/export-docx', {
      method: 'POST',
      body: JSON.stringify({ fortnight_id: '11111111-1111-4111-8111-111111111111', orientation }),
    })
  )
  expect(response.status).toBe(200)
  const zip = await JSZip.loadAsync(await response.arrayBuffer())
  const xml = await zip.file('word/document.xml')!.async('string')
  return {
    xml,
    page: xml.match(/<w:pgSz\b[^>]*\/>/)?.[0],
    styles: await zip.file('word/styles.xml')!.async('string'),
  }
}

beforeEach(() => {
  mocks.rules = {
    page_orientation: 'horizontal',
    page_size_twips: { width: 16838, height: 11906 },
    page_margins_twips: { top: 720, bottom: 720, left: 900, right: 900 },
    font_family: 'Century Gothic',
    font_size_pt: 12,
  }
})

describe('Word export page geometry', () => {
  it('defaults to the uploaded landscape format with its actual page size, margins and font', async () => {
    const { xml, page, styles } = await exportedPage()
    expect(page).toContain('w:orient="landscape"')
    expect(page).toContain('w:w="16838"')
    expect(page).toContain('w:h="11906"')
    expect(xml).toMatch(/<w:pgMar[^>]*w:top="720"/)
    expect(xml).toMatch(/<w:pgMar[^>]*w:left="900"/)
    expect(xml).toContain('Compartimos descubrimientos')
    expect(styles).toContain('Century Gothic')
  })
  it('keeps landscape dimensions when the viewer explicitly requests horizontal', async () => {
    const { page } = await exportedPage('horizontal')
    expect(page).toContain('w:w="16838"')
    expect(page).toContain('w:h="11906"')
  })
  it('lets the teacher override an uploaded landscape format to portrait', async () => {
    const { page } = await exportedPage('vertical')
    expect(page).toContain('w:orient="portrait"')
    expect(page).toContain('w:w="11906"')
    expect(page).toContain('w:h="16838"')
  })
  it('defaults legacy plans without a format to portrait Letter paper', async () => {
    mocks.rules = {}
    const { page } = await exportedPage()
    expect(page).toContain('w:orient="portrait"')
    expect(page).toContain('w:w="12240"')
    expect(page).toContain('w:h="15840"')
  })
})
