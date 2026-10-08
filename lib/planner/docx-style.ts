import JSZip from 'jszip'

export type DocxStyle = {
  font_family?: string
  font_size_pt?: number
  page_size_twips?: { width: number; height: number }
  page_margins_twips?: { top: number; right: number; bottom: number; left: number }
  page_orientation?: 'horizontal' | 'vertical'
}

function tag(block: string, name: string): string {
  return block.match(new RegExp(`<w:${name}\\b[^>]*>`))?.[0] ?? ''
}
function attr(xml: string, name: string): string | null {
  return xml.match(new RegExp(`\\bw:${name}="([^"]+)"`))?.[1] ?? null
}
function bounded(raw: string | null, min: number, max: number): number | undefined {
  const value = Number(raw)
  return Number.isFinite(value) && value >= min && value <= max ? value : undefined
}

/** Read measurable Word layout properties directly from the uploaded file, not from an LLM guess. */
export async function readDocxStyle(buffer: Buffer): Promise<DocxStyle> {
  try {
    const zip = await JSZip.loadAsync(buffer)
    const styles = (await zip.file('word/styles.xml')?.async('string')) ?? ''
    const document = (await zip.file('word/document.xml')?.async('string')) ?? ''
    const defaults = styles.match(/<w:docDefaults\b[\s\S]*?<\/w:docDefaults>/)?.[0] ?? ''
    const normal =
      styles.match(/<w:style\b[^>]*w:styleId="Normal"[^>]*>[\s\S]*?<\/w:style>/)?.[0] ?? ''
    const runStyle = defaults || normal
    const font = attr(tag(runStyle, 'rFonts'), 'ascii') ?? attr(tag(normal, 'rFonts'), 'ascii')
    const sizeHalfPoints = bounded(
      attr(tag(runStyle, 'sz'), 'val') ?? attr(tag(normal, 'sz'), 'val'),
      12,
      56
    )
    const pgSz = tag(document, 'pgSz')
    const width = bounded(attr(pgSz, 'w'), 9000, 22000)
    const height = bounded(attr(pgSz, 'h'), 9000, 22000)
    const pgMar = tag(document, 'pgMar')
    const margins = {
      top: bounded(attr(pgMar, 'top'), 360, 2880),
      right: bounded(attr(pgMar, 'right'), 360, 2880),
      bottom: bounded(attr(pgMar, 'bottom'), 360, 2880),
      left: bounded(attr(pgMar, 'left'), 360, 2880),
    }
    return {
      ...(font && /^[\w\s-]{1,60}$/.test(font) ? { font_family: font } : {}),
      ...(sizeHalfPoints ? { font_size_pt: sizeHalfPoints / 2 } : {}),
      ...(width && height
        ? {
            page_size_twips: { width, height },
            page_orientation:
              attr(pgSz, 'orient') === 'landscape' || width > height
                ? ('horizontal' as const)
                : ('vertical' as const),
          }
        : {}),
      ...(Object.values(margins).every((v) => v != null)
        ? {
            page_margins_twips: margins as {
              top: number
              right: number
              bottom: number
              left: number
            },
          }
        : {}),
    }
  } catch {
    return {}
  }
}
