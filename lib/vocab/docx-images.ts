// Client-side extractor for a flashcard-style vocabulary .docx (word, then its illustrating image).
// Runs entirely in the browser (JSZip) so a big 20 MB+ file never hits the server — only the small
// resized thumbnails are uploaded afterwards. Matches each image to the word immediately preceding
// it, dedupes to one image per word, and downsizes to a light JPEG thumbnail.
import JSZip from 'jszip'

export type ExtractedVocabImage = { word: string; blob: Blob; previewUrl: string }

// Accept a plausible vocabulary word (skip the instruction/color noise: "Contorno azul", etc.).
function isCleanWord(t: string): boolean {
  return /^[A-Za-z][A-Za-z'\- ]{0,28}$/.test(t) && !/contorno|palabra|imagen|miss|gracias/i.test(t)
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

  // Linear scan of text runs + image references, IN DOCUMENT ORDER.
  const tokens: Array<{ word?: string; rId?: string }> = []
  const re = /<w:t[^>]*>([^<]*)<\/w:t>|<a:blip[^>]*?r:embed="([^"]+)"/g
  let mm: RegExpExecArray | null
  while ((mm = re.exec(docXml))) {
    if (mm[1] !== undefined) {
      const t = mm[1].trim()
      if (t) tokens.push({ word: t })
    } else if (mm[2]) {
      tokens.push({ rId: mm[2] })
    }
  }

  // Pair each image with the nearest clean word before it; keep the first image per word.
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
    const mediaPath = target.startsWith('word/') ? target : `word/${target}`
    const entry = zip.file(mediaPath)
    if (!entry) continue
    const raw = await entry.async('blob')
    const thumb = await resizeToThumb(raw, 256)
    if (thumb) out.push({ word: p.word, blob: thumb, previewUrl: URL.createObjectURL(thumb) })
  }
  return out
}

// Downscale to a <=maxPx JPEG thumbnail (flatten transparency onto white). Keeps storage tiny.
async function resizeToThumb(blob: Blob, maxPx: number): Promise<Blob | null> {
  const img = await blobToImage(blob)
  if (!img) return null
  const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82))
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
