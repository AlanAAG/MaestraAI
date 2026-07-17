import { describe, it, expect } from 'vitest'
import { chunkMarkdown, MAX_CHUNK_CHARS, MIN_CHUNK_CHARS } from './chunking'

const para = (n: number, len = 300) => `Párrafo ${n}. ${'contenido pedagógico '.repeat(len / 21)}`

describe('chunkMarkdown', () => {
  it('builds heading_path breadcrumbs from the heading stack', () => {
    const md = [
      '# Documento',
      para(1),
      '## Sección A',
      para(2),
      '### Subsección A.1',
      para(3),
      '## Sección B',
      para(4),
    ].join('\n\n')
    // Force one chunk per section so each breadcrumb is observable.
    const chunks = chunkMarkdown(md, 'test.md')
    const paths = chunks.map((c) => c.heading_path)
    expect(paths[0]).toBe('Documento')
    // Breadcrumbs deepen and pop correctly.
    const all = chunkMarkdown(
      [
        '# Documento',
        para(1, 3000),
        '## Sección A',
        para(2, 3000),
        '### Subsección A.1',
        para(3, 3000),
        '## Sección B',
        para(4, 3000),
      ].join('\n\n'),
      'test.md'
    )
    expect(all.map((c) => c.heading_path)).toEqual([
      'Documento',
      'Documento > Sección A',
      'Documento > Sección A > Subsección A.1',
      'Documento > Sección B',
    ])
  })

  it('respects chunk size bounds', () => {
    const md =
      '# Doc\n\n' + Array.from({ length: 30 }, (_, i) => `## S${i}\n\n${para(i, 700)}`).join('\n\n')
    const chunks = chunkMarkdown(md, 'test.md')
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS + 100) // heading slack
      expect(c.content.length).toBeGreaterThanOrEqual(MIN_CHUNK_CHARS)
      expect(c.source).toBe('test.md')
      expect(c.tokens).toBe(Math.round(c.content.length / 4))
    }
  })

  it('packs small sections together instead of one chunk each', () => {
    const md =
      '# Doc\n\n' + Array.from({ length: 8 }, (_, i) => `## S${i}\n\n${para(i, 200)}`).join('\n\n')
    const chunks = chunkMarkdown(md, 'test.md')
    expect(chunks.length).toBeLessThan(8)
    // Packed chunks keep section headings inline so they stay self-describing.
    expect(chunks[0].content).toContain('## S0')
    expect(chunks[0].content).toContain('## S1')
  })

  it('splits long sections on paragraph boundaries with a one-paragraph overlap', () => {
    const paras = Array.from({ length: 8 }, (_, i) => para(i, 900))
    const md = `# Doc\n\n## Larga\n\n${paras.join('\n\n')}`
    const chunks = chunkMarkdown(md, 'test.md')
    expect(chunks.length).toBeGreaterThan(1)
    // Every piece keeps the section's breadcrumb.
    for (const c of chunks) expect(c.heading_path).toBe('Doc > Larga')
    // Overlap: the last paragraph of chunk N reappears at the start of chunk N+1.
    const lastParaOfFirst = chunks[0].content.split('\n\n').pop()!
    expect(chunks[1].content).toContain(lastParaOfFirst.slice(0, 80))
  })

  it('drops sections matched by skipHeading (Programa PDA tables)', () => {
    const md = [
      '# Lenguajes',
      '## Finalidades del Campo',
      para(1, 500),
      '### Contenido: Comunicación oral de necesidades',
      'PDA verbatim que NO debe ingresar.',
      '## Especificidades',
      para(2, 500),
    ].join('\n\n')
    const chunks = chunkMarkdown(md, 'programa.md', {
      skipHeading: (h) => h.startsWith('Contenido:'),
    })
    const joined = chunks.map((c) => c.content).join('\n')
    expect(joined).not.toContain('PDA verbatim')
    expect(joined).toContain('Finalidades')
    expect(joined).toContain('Especificidades')
  })

  it('drops noise below the minimum chunk size', () => {
    const chunks = chunkMarkdown('# Solo título\n\nok', 'test.md')
    expect(chunks).toEqual([])
  })
})
