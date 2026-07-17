// Heading-aware markdown chunking for the NEM knowledge RAG layer (migration 066).
// Pure — used by scripts/ingest-nem-knowledge.mjs (via tsx) and tested in chunking.test.ts.
//
// Strategy: split the doc into heading-delimited sections, keep a breadcrumb of the heading
// stack ("H1 > H2 > H3"), then pack consecutive sections into chunks of ~MAX_CHUNK_CHARS
// (~500-900 tokens). Sections longer than the max are split on paragraph boundaries with a
// one-paragraph overlap so no retrieval boundary loses context.

export type KnowledgeChunk = {
  source: string
  heading_path: string
  content: string
  tokens: number // rough estimate (chars/4) — informational only
}

export const MAX_CHUNK_CHARS = 3600 // ~900 tokens
export const MIN_CHUNK_CHARS = 80 // drop noise (lone headings, separators)

type Section = { headingPath: string; heading: string; body: string }

const estimateTokens = (s: string) => Math.round(s.length / 4)

// Split into sections at every markdown heading, tracking the heading stack for breadcrumbs.
function splitSections(text: string): Section[] {
  const lines = text.split(/\r?\n/)
  const stack: { level: number; title: string }[] = []
  const sections: Section[] = []
  let current: Section = { headingPath: '', heading: '', body: '' }

  const flush = () => {
    if (current.body.trim() || current.heading) sections.push(current)
  }

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (m) {
      flush()
      const level = m[1].length
      const title = m[2].trim()
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop()
      stack.push({ level, title })
      current = {
        headingPath: stack.map((h) => h.title).join(' > '),
        heading: title,
        body: '',
      }
    } else {
      current.body += line + '\n'
    }
  }
  flush()
  return sections
}

// Split an oversized body on paragraph boundaries with a one-paragraph overlap between pieces.
function splitLongBody(body: string): string[] {
  const paras = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const pieces: string[] = []
  let buf: string[] = []
  let len = 0
  for (const p of paras) {
    if (len + p.length > MAX_CHUNK_CHARS && buf.length) {
      pieces.push(buf.join('\n\n'))
      const overlap = buf[buf.length - 1] // 1-paragraph overlap
      buf = overlap.length < MAX_CHUNK_CHARS / 2 ? [overlap] : []
      len = buf.reduce((n, s) => n + s.length, 0)
    }
    // A single paragraph longer than the max gets hard-sliced (rare: giant tables).
    if (p.length > MAX_CHUNK_CHARS) {
      if (buf.length) {
        pieces.push(buf.join('\n\n'))
        buf = []
        len = 0
      }
      for (let i = 0; i < p.length; i += MAX_CHUNK_CHARS) {
        pieces.push(p.slice(i, i + MAX_CHUNK_CHARS))
      }
      continue
    }
    buf.push(p)
    len += p.length + 2
  }
  if (buf.length) pieces.push(buf.join('\n\n'))
  return pieces
}

export function chunkMarkdown(
  text: string,
  source: string,
  options?: {
    // Return true to drop a section (matched on its own heading text), e.g. the Programa's
    // "Contenido: …" PDA tables, already served verbatim by lib/nem/contenidos-fase2.ts.
    skipHeading?: (heading: string) => boolean
  }
): KnowledgeChunk[] {
  const sections = splitSections(text).filter(
    (s) => !(s.heading && options?.skipHeading?.(s.heading))
  )

  const chunks: KnowledgeChunk[] = []
  let buf: string[] = []
  let bufPath = ''
  let bufLen = 0

  const flush = () => {
    const content = buf.join('\n\n').trim()
    if (content.length >= MIN_CHUNK_CHARS) {
      chunks.push({ source, heading_path: bufPath, content, tokens: estimateTokens(content) })
    }
    buf = []
    bufLen = 0
  }

  for (const s of sections) {
    const body = s.body.trim()
    // Section text keeps its own heading inline so packed chunks stay self-describing.
    const sectionText = s.heading ? `## ${s.heading}\n${body}`.trim() : body
    if (!sectionText) continue

    if (sectionText.length > MAX_CHUNK_CHARS) {
      flush()
      for (const piece of splitLongBody(body)) {
        const content = (s.heading ? `## ${s.heading}\n` : '') + piece
        if (content.trim().length >= MIN_CHUNK_CHARS) {
          chunks.push({
            source,
            heading_path: s.headingPath,
            content: content.trim(),
            tokens: estimateTokens(content),
          })
        }
      }
      continue
    }

    if (bufLen + sectionText.length > MAX_CHUNK_CHARS) flush()
    if (!buf.length) bufPath = s.headingPath
    buf.push(sectionText)
    bufLen += sectionText.length + 2
  }
  flush()
  return chunks
}
