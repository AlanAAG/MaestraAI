import { describe, it, expect } from 'vitest'
import { detectDocxOrientation } from './extract-template'

// Build a minimal ZIP with a single STORED (uncompressed) entry, so the detector reads the XML
// directly without needing real DEFLATE data. Mirrors a Word docx's local file header layout.
function zipWithDocumentXml(xml: string): Buffer {
  const name = Buffer.from('word/document.xml', 'utf8')
  const data = Buffer.from(xml, 'utf8')
  const header = Buffer.alloc(30)
  header.writeUInt32LE(0x04034b50, 0) // local file header signature
  header.writeUInt16LE(0, 8) // method 0 = stored
  header.writeUInt32LE(data.length, 18) // compressed size
  header.writeUInt32LE(data.length, 22) // uncompressed size
  header.writeUInt16LE(name.length, 26) // filename length
  header.writeUInt16LE(0, 28) // extra length
  return Buffer.concat([header, name, data])
}

describe('detectDocxOrientation', () => {
  it('detects landscape via orient attribute', () => {
    const buf = zipWithDocumentXml('<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>')
    expect(detectDocxOrientation(buf)).toBe('horizontal')
  })

  it('detects portrait via orient attribute', () => {
    const buf = zipWithDocumentXml('<w:pgSz w:w="12240" w:h="15840" w:orient="portrait"/>')
    expect(detectDocxOrientation(buf)).toBe('vertical')
  })

  it('falls back to width/height when no orient attribute', () => {
    expect(detectDocxOrientation(zipWithDocumentXml('<w:pgSz w:w="15840" w:h="12240"/>'))).toBe(
      'horizontal'
    )
    expect(detectDocxOrientation(zipWithDocumentXml('<w:pgSz w:w="12240" w:h="15840"/>'))).toBe(
      'vertical'
    )
  })

  it('returns null for a non-zip / unreadable buffer', () => {
    expect(detectDocxOrientation(Buffer.from('not a zip'))).toBeNull()
  })
})
