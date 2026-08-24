import { describe, expect, it } from 'vitest'
import { escapeHtml, escapeLike } from './html'

describe('escapeHtml', () => {
  it('neutralizes markup and quotes', () => {
    expect(escapeHtml(`<img src=x onerror="1">&'`)).toBe(
      '&lt;img src=x onerror=&quot;1&quot;&gt;&amp;&#39;'
    )
  })
  it('passes plain text through', () => {
    expect(escapeHtml('Tarea de la letra M')).toBe('Tarea de la letra M')
  })
})

describe('escapeLike', () => {
  it('escapes %, _ and backslash', () => {
    expect(escapeLike('a%b_c\\d@x.com')).toBe('a\\%b\\_c\\\\d@x.com')
  })
  it('leaves normal emails alone', () => {
    expect(escapeLike('miss@escuela.mx')).toBe('miss@escuela.mx')
  })
})
