// App-wide color themes ("complete environment change"). A theme is one brand hex; we derive a
// coherent set of CSS-var overrides (brand + hover/light/subtle, page/inset surfaces, and the
// shadcn HSL trio) so buttons, nav, cards, and the page background all shift together.
// Applied by overriding these vars on document.documentElement (see app/(main)/layout.tsx).

export type ThemeId =
  | 'default'
  | 'teal'
  | 'coral'
  | 'violet'
  | 'forest'
  | 'ocean'
  | 'rose'
  | 'slate'

// Brand hex per theme. 'default' is the app's gold and produces no override.
export const THEME_BRAND: Record<Exclude<ThemeId, 'default'>, { label: string; brand: string }> = {
  teal: { label: 'Verde azulado', brand: '#0f766e' },
  coral: { label: 'Coral', brand: '#e11d48' },
  violet: { label: 'Violeta', brand: '#7c3aed' },
  forest: { label: 'Bosque', brand: '#15803d' },
  ocean: { label: 'Océano', brand: '#1d4ed8' },
  rose: { label: 'Rosa', brand: '#db2777' },
  slate: { label: 'Pizarra', brand: '#475569' },
}

export type Hsl = { h: number; s: number; l: number }

/** #rrggbb → HSL (h 0-360, s/l 0-100). Rounded. */
export function hexToHsl(hex: string): Hsl {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

const hslCss = ({ h, s, l }: Hsl) => `hsl(${h} ${s}% ${l}%)`
const hslTriplet = ({ h, s, l }: Hsl) => `${h} ${s}% ${l}%`

/**
 * The CSS-var override map for a theme, or null for default/unknown.
 * Keys are real CSS custom properties set on the document root.
 */
export function appThemeVars(themeId?: string | null): Record<string, string> | null {
  if (!themeId || themeId === 'default') return null
  const entry = THEME_BRAND[themeId as Exclude<ThemeId, 'default'>]
  if (!entry) return null
  const base = hexToHsl(entry.brand)
  const hover: Hsl = { h: base.h, s: base.s, l: Math.min(base.l + 8, 96) }
  const light: Hsl = { h: base.h, s: base.s, l: Math.min(base.l + 22, 82) }
  const subtle: Hsl = { h: base.h, s: Math.min(base.s, 60), l: 95 }
  const page: Hsl = { h: base.h, s: Math.min(base.s, 40), l: 97 }
  const inset: Hsl = { h: base.h, s: Math.min(base.s, 45), l: 93 }
  return {
    // --color-* consumed as background-color/color → hsl() literals are fine.
    '--color-brand': entry.brand,
    '--color-brand-hover': hslCss(hover),
    '--color-brand-light': hslCss(light),
    '--color-brand-subtle': hslCss(subtle),
    '--color-page': hslCss(page),
    '--color-inset': hslCss(inset),
    // shadcn tokens are consumed via hsl(var(--x)) → bare "H S% L%" triplets.
    '--primary': hslTriplet(base),
    '--ring': hslTriplet(base),
    '--secondary': hslTriplet(subtle),
    '--secondary-foreground': hslTriplet(base),
  }
}
