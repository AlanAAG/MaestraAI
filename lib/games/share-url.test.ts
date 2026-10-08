import { expect, it } from 'vitest'
import { gameShareUrl } from './share-url'

it('does not send families to a development URL or invalid configured URL', () => {
  for (const configured of ['http://localhost:3000', 'https://127.0.0.1', 'not a URL']) {
    expect(gameShareUrl('https://escuela.maestraia.com', 'abc', configured)).toBe(
      'https://escuela.maestraia.com/jugar/abc'
    )
  }
})
it('uses the canonical public origin without carrying a configuration path or query', () => {
  expect(
    gameShareUrl('https://preview.vercel.app', 'abc', 'https://maestraia.com/school?x=1')
  ).toBe('https://maestraia.com/jugar/abc')
})
