import { describe, expect, it } from 'vitest'
import { appThemeVars, hexToHsl, THEME_BRAND } from './themes'

describe('appThemeVars', () => {
  it('default/unknown → null', () => {
    expect(appThemeVars('default')).toBeNull()
    expect(appThemeVars(null)).toBeNull()
    expect(appThemeVars(undefined)).toBeNull()
    expect(appThemeVars('nope')).toBeNull()
  })

  it('every theme yields the full required var set', () => {
    const required = [
      '--color-brand',
      '--color-brand-hover',
      '--color-brand-light',
      '--color-brand-subtle',
      '--color-page',
      '--color-inset',
      '--primary',
      '--ring',
      '--secondary',
      '--secondary-foreground',
    ]
    for (const id of Object.keys(THEME_BRAND)) {
      const vars = appThemeVars(id)
      expect(vars, id).not.toBeNull()
      for (const k of required) expect(vars![k], `${id} ${k}`).toBeTruthy()
    }
  })

  it('shadcn vars are bare HSL triplets, --color-* are literals', () => {
    const vars = appThemeVars('ocean')!
    expect(vars['--primary']).toMatch(/^\d+ \d+% \d+%$/)
    expect(vars['--color-brand']).toBe('#1d4ed8')
    expect(vars['--color-brand-subtle']).toMatch(/^hsl\(/)
  })
})

describe('hexToHsl', () => {
  it('known conversions', () => {
    expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 })
    expect(hexToHsl('#ffffff')).toEqual({ h: 0, s: 0, l: 100 })
    const red = hexToHsl('#ff0000')
    expect(red.h).toBe(0)
    expect(red.s).toBe(100)
    expect(red.l).toBe(50)
  })
})
