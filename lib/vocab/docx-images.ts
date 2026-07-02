// Client-side extractor for a flashcard-style vocabulary .docx (word, then its illustrating image).
// Runs entirely in the browser (JSZip) so a big 20 MB+ file never hits the server — only the small
// resized thumbnails are uploaded afterwards.
//
// Two subtleties handled here (Word does both):
//  1. A word is often split across several <w:t> runs ("pinea"+"ppl"+"e") → we concatenate runs
//     PER PARAGRAPH before matching, so the word is whole.
//  2. Word crops each image via <a:srcRect> WITHOUT changing the media file, so the raw media often
//     contains extra content (the "no" half of a yes/no card, colored tabs, borders). We read the
//     crop and apply it, then center the result on a white square so nothing is cut off.
import JSZip from 'jszip'

export type ExtractedVocabImage = { word: string; blob: Blob; previewUrl: string }
type Crop = { l: number; t: number; r: number; b: number } // fractions 0..1

function isCleanWord(t: string): boolean {
  return /^[A-Za-z][A-Za-z' -]{1,28}$/.test(t) && !/contorno|palabra|imagen|miss|gracias/i.test(t)
}

// srcRect attrs are in 1/100000ths of the image; negatives mean padding → clamp to 0.
function parseCrop(attrs: string): Crop {
  const g = (k: string) => {
    const m = attrs.match(new RegExp(`${k}="(-?\\d+)"`))
    return m ? Math.max(0, parseInt(m[1], 10)) / 100000 : 0
  }
  return { l: g('l'), t: g('t'), r: g('r'), b: g('b') }
}

export async function extractVocabImagesFromDocx(file: File): Promise<ExtractedVocabImage[]> {
  const zip = await JSZip.loadAsync(file)
  const docXml = await zip.file('word/document.xml')?.async('string')
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string')
  if (!docXml || !relsXml) throw new Error('El archivo no parece un .docx válido.')

  // rId → media target (e.g. "media/image6.png")
  const rels: Record<string, string> = {}
  for (const m of Array.from(
    relsXml.matchAll(/<Relationship[^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"/g)
  )) {
    rels[m[1]] = m[2].replace(/^\.?\//, '')
  }

  // rId → crop rectangle (the srcRect inside the same blipFill; "" if none).
  const crops: Record<string, string> = {}
  for (const m of Array.from(
    docXml.matchAll(
      /<a:blip[^>]*?r:embed="([^"]+)"[\s\S]*?(?:<a:srcRect([^>]*)\/>|<a:stretch|<\/pic:blipFill>)/g
    )
  )) {
    crops[m[1]] = (m[2] || '').trim()
  }

  // Paragraph-aware linear scan: concatenate text runs per paragraph, keep image order.
  const tokens: Array<{ word?: string; rId?: string }> = []
  let buf = ''
  const flush = () => {
    const t = buf.trim()
    if (t) tokens.push({ word: t })
    buf = ''
  }
  const re = /<w:p\b|<w:t[^>]*>([^<]*)<\/w:t>|<a:blip[^>]*?r:embed="([^"]+)"/g
  let mm: RegExpExecArray | null
  while ((mm = re.exec(docXml))) {
    if (mm[0].startsWith('<w:p')) {
      flush() // new paragraph → the previous one is a complete word
    } else if (mm[1] !== undefined) {
      buf += mm[1]
    } else if (mm[2]) {
      flush()
      tokens.push({ rId: mm[2] })
    }
  }
  flush()

  // Pair each image with the nearest clean word before it; first image per word wins.
  const seen = new Set<string>()
  const pairs: { word: string; rId: string }[] = []
  for (let i = 0; i < tokens.length; i++) {
    const rId = tokens[i].rId
    if (!rId) continue
    for (let j = i - 1; j >= 0; j--) {
      const w = tokens[j].word
      if (w && isCleanWord(w)) {
        const word = w.toLowerCase().trim()
        if (!seen.has(word)) {
          seen.add(word)
          pairs.push({ word, rId })
        }
        break
      }
    }
  }

  const out: ExtractedVocabImage[] = []
  for (const p of pairs) {
    const target = rels[p.rId]
    if (!target) continue
    const entry = zip.file(target.startsWith('word/') ? target : `word/${target}`)
    if (!entry) continue
    // Isolate each image: one bad media file must never zero the whole batch. If resize fails,
    // fall back to the raw (uncropped) media so the word still gets a picture.
    try {
      const raw = await entry.async('blob')
      const thumb = (await resizeToThumb(raw, 256, parseCrop(crops[p.rId] ?? ''))) ?? raw
      out.push({ word: p.word, blob: thumb, previewUrl: URL.createObjectURL(thumb) })
    } catch (e) {
      console.warn('[docx-import] skipped image for', p.word, e)
    }
  }
  return out
}

// Apply the crop, scale to fit, and center on a white SQUARE so nothing is ever cut off.
// Never throws: a bad crop falls back to the full image; an undecodable image returns null.
async function resizeToThumb(blob: Blob, size: number, crop: Crop): Promise<Blob | null> {
  const img = await blobToImage(blob)
  if (!img || !img.width || !img.height) return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  // Cropped source rect, clamped to the real image bounds so 9-arg drawImage can't go out of range.
  const sx = Math.min(Math.max(0, img.width * crop.l), img.width - 1)
  const sy = Math.min(Math.max(0, img.height * crop.t), img.height - 1)
  const cw = Math.max(1, Math.min(img.width - sx, img.width * (1 - crop.l - crop.r)))
  const ch = Math.max(1, Math.min(img.height - sy, img.height * (1 - crop.t - crop.b)))

  const draw = (sxx: number, syy: number, sww: number, shh: number) => {
    const scale = Math.min(size / sww, size / shh)
    const dw = Math.max(1, Math.round(sww * scale))
    const dh = Math.max(1, Math.round(shh * scale))
    ctx.drawImage(img, sxx, syy, sww, shh, (size - dw) / 2, (size - dh) / 2, dw, dh)
  }
  try {
    draw(sx, sy, cw, ch)
  } catch {
    // Odd crop/source rect → fall back to the whole image (pre-crop behavior).
    try {
      ctx.fillRect(0, 0, size, size)
      draw(0, 0, img.width, img.height)
    } catch {
      return null
    }
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85))
}

function blobToImage(blob: Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
