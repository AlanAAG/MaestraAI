import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { readDocxStyle } from './docx-style'

it('reads the actual font, size and page setup from a Word format', async () => {
  const zip = new JSZip()
  zip.file(
    'word/styles.xml',
    '<w:styles><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>'
  )
  zip.file(
    'word/document.xml',
    '<w:document><w:body><w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="720" w:right="900" w:bottom="720" w:left="900"/></w:sectPr></w:body></w:document>'
  )
  const data = await zip.generateAsync({ type: 'nodebuffer' })
  expect(await readDocxStyle(data)).toEqual({
    font_family: 'Arial',
    font_size_pt: 12,
    page_size_twips: { width: 15840, height: 12240 },
    page_orientation: 'horizontal',
    page_margins_twips: { top: 720, right: 900, bottom: 720, left: 900 },
  })
})

describe('invalid uploads', () => {
  it('returns no guessed layout for a broken document', async () => {
    expect(await readDocxStyle(Buffer.from('not a docx'))).toEqual({})
  })
})
