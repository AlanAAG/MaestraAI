// Ingests the institutional NEM corpus (context/*.md) into nem_knowledge (migration 066) for
// the planeación RAG layer: heading-aware chunking → OpenAI embeddings → wipe-and-reload per file.
// Run (needs tsx — it imports the TS chunker):
//   npx tsx scripts/ingest-nem-knowledge.mjs
// Re-run whenever a context/*.md source changes. Idempotent per source file.
//
// Exclusions:
// - fichero_de_la_paz.md         → already served exactly via lib/nem/fichero-paz.ts
// - NEM_SYNTHESIS.md             → already always-on in every prompt (lib/nem/synthesis.ts)
// - Programa's "Contenido: …" sections → PDAs already verbatim in lib/nem/contenidos-fase2.ts
//   (the Programa's PROSE — introducción, finalidades, especificidades — IS ingested)
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { chunkMarkdown } from '../lib/nem/chunking'

const CONTEXT_DIR = 'context'
const EXCLUDED_FILES = new Set(['fichero_de_la_paz.md', 'NEM_SYNTHESIS.md'])
const EMBED_MODEL = 'text-embedding-3-small' // 1536 dims (matches the migration)
const EMBED_BATCH = 64
const INSERT_BATCH = 100

// This runs outside Next.js, which would normally inject .env.local — so load it ourselves.
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const eq = line.indexOf('=')
        if (eq === -1) continue
        const k = line.slice(0, eq).trim()
        if (!/^[A-Z0-9_]+$/.test(k) || process.env[k]) continue
        process.env[k] = line
          .slice(eq + 1)
          .trim()
          .replace(/^["']|["']$/g, '')
      }
      break
    } catch {
      /* file not found — try the next */
    }
  }
}
loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiKey = process.env.OPENAI_API_KEY
if (!url || !key || !openaiKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or OPENAI_API_KEY (.env.local). Aborting.'
  )
  process.exit(1)
}
const supabase = createClient(url, key)
const openai = new OpenAI({ apiKey: openaiKey })

async function embedBatch(texts) {
  const out = []
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH).map((t) => t.slice(0, 8000))
    const r = await openai.embeddings.create({ model: EMBED_MODEL, input: batch })
    // API returns embeddings with an index — order-preserving, but sort defensively.
    const sorted = [...r.data].sort((a, b) => a.index - b.index)
    out.push(...sorted.map((d) => d.embedding))
  }
  return out
}

async function ingestFile(filename) {
  const text = readFileSync(join(CONTEXT_DIR, filename), 'utf8')
  const options =
    filename === 'Programa_sintetico_fase_2.md'
      ? { skipHeading: (h) => h.startsWith('Contenido:') }
      : undefined
  const chunks = chunkMarkdown(text, filename, options)
  if (!chunks.length) {
    console.log(`${filename}: 0 chunks (skipped)`)
    return 0
  }

  const embeddings = await embedBatch(chunks.map((c) => c.content))
  if (embeddings.length !== chunks.length) {
    throw new Error(`${filename}: got ${embeddings.length} embeddings for ${chunks.length} chunks`)
  }

  // Wipe-and-reload per source: idempotent re-runs.
  const { error: delError } = await supabase.from('nem_knowledge').delete().eq('source', filename)
  if (delError) throw new Error(`${filename}: delete failed — ${delError.message}`)

  const rows = chunks.map((c, i) => ({
    source: c.source,
    heading_path: c.heading_path || null,
    content: c.content,
    tokens: c.tokens,
    embedding: JSON.stringify(embeddings[i]),
  }))
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const { error } = await supabase.from('nem_knowledge').insert(rows.slice(i, i + INSERT_BATCH))
    if (error) throw new Error(`${filename}: insert failed — ${error.message}`)
  }
  console.log(`${filename}: ${chunks.length} chunks ingested`)
  return chunks.length
}

const files = readdirSync(CONTEXT_DIR)
  .filter((f) => f.endsWith('.md') && !EXCLUDED_FILES.has(f))
  .sort()

console.log(`Ingesting ${files.length} corpus files: ${files.join(', ')}`)
let total = 0
for (const f of files) {
  total += await ingestFile(f)
}
console.log(`Done. ${total} total chunks in nem_knowledge.`)
