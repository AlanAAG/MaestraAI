import { describe, expect, it } from 'vitest'
import { schoolSlugFromHost } from './host'

describe('schoolSlugFromHost', () => {
  it('extracts the slug from school subdomains', () => {
    expect(schoolSlugFromHost('epa.maestraia.com')).toBe('epa')
    expect(schoolSlugFromHost('mi-escuela.maestraia.mx')).toBe('mi-escuela')
    expect(schoolSlugFromHost('EPA.maestraia.com:443')).toBe('epa')
    expect(schoolSlugFromHost('epa.maestraai.mx')).toBe('epa')
  })
  it('ignores apex, www and reserved names', () => {
    expect(schoolSlugFromHost('maestraia.com')).toBeNull()
    expect(schoolSlugFromHost('www.maestraia.com')).toBeNull()
    expect(schoolSlugFromHost('diario.maestraai.mx')).toBeNull()
    expect(schoolSlugFromHost('api.maestraia.com')).toBeNull()
  })
  it('ignores previews, localhost and nested/foreign hosts', () => {
    expect(schoolSlugFromHost('maestra-ai.vercel.app')).toBeNull()
    expect(schoolSlugFromHost('localhost:3000')).toBeNull()
    expect(schoolSlugFromHost('a.b.maestraia.com')).toBeNull()
    expect(schoolSlugFromHost('epa.maestraia.com.evil.com')).toBeNull()
    expect(schoolSlugFromHost(null)).toBeNull()
  })
})
