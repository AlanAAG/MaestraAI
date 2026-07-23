// App-wide color themes ("complete environment change"). A theme is one vibrant brand hex; we
// derive a coherent, clearly-visible set of CSS-var overrides — vibrant accent PLUS tinted page,
// cards, insets and borders — so the WHOLE environment (not just buttons) shifts to the theme.
// Applied by overriding these vars on document.documentElement (see app/(main)/layout.tsx).

export type ThemeId =
  | 'default'
  | 'teal'
  | 'coral'
  | 'violet'
  | 'forest'
  | 'ocean'
  | 'rose'
  | 'sunset'
  | 'indigo'
  | 'cyan'
  | 'fuchsia'
  | 'amber'
  | 'slate'

// Vibrant brand hex per theme. 'default' is the app's gold and produces no override.
export const THEME_BRAND: Record<Exclude<ThemeId, 'default'>, { label: string; brand: string }> = {
  teal: { label: 'Verde azulado', brand: '#0d9488' },
  coral: { label: 'Coral', brand: '#e11d48' },
  violet: { label: 'Violeta', brand: '#7c3aed' },
  forest: { label: 'Bosque', brand: '#16a34a' },
  ocean: { label: 'Océano', brand: '#2563eb' },
  rose: { label: 'Rosa', brand: '#db2777' },
  sunset: { label: 'Atardecer', brand: '#ea580c' },
  indigo: { label: 'Índigo', brand: '#4f46e5' },
  cyan: { label: 'Cian', brand: '#0891b2' },
  fuchsia: { label: 'Fucsia', brand: '#c026d3' },
  amber: { label: 'Ámbar', brand: '#d97706' },
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

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const hslCss = ({ h, s, l }: Hsl) => `hsl(${h} ${s}% ${l}%)`
const hslTriplet = ({ h, s, l }: Hsl) => `${h} ${s}% ${l}%`

/**
 * The CSS-var override map for a theme, or null for default/unknown. Keys are real CSS custom
 * properties set on the document root. Tints are intentionally strong-but-legible: dark text
 * stays readable on the tinted page, white text stays readable on the vibrant brand.
 */
export function appThemeVars(themeId?: string | null): Record<string, string> | null {
  if (!themeId || themeId === 'default') return null
  const entry = THEME_BRAND[themeId as Exclude<ThemeId, 'default'>]
  if (!entry) return null
  const { h, s } = hexToHsl(entry.brand)
  const base = hexToHsl(entry.brand)

  // Accent family (vibrant).
  const hover: Hsl = { h, s, l: clamp(base.l - 7, 18, 90) }
  const light: Hsl = { h, s, l: clamp(base.l + 20, 60, 80) }
  const subtle: Hsl = { h, s: clamp(s, 0, 70), l: 91 } // nav-active pill — clearly colored
  // Surfaces (clearly tinted so the whole environment reads as the theme, still light + readable).
  const page: Hsl = { h, s: clamp(s, 0, 50), l: 93 }
  const card: Hsl = { h, s: clamp(s, 0, 30), l: 98 }
  const inset: Hsl = { h, s: clamp(s, 0, 48), l: 88 }
  const border: Hsl = { h, s: clamp(s, 0, 32), l: 85 }
  const borderStrong: Hsl = { h, s: clamp(s, 0, 32), l: 78 }

  return {
    // --color-* consumed as background-color/color → hsl() literals are fine.
    '--color-brand': entry.brand,
    '--color-brand-hover': hslCss(hover),
    '--color-brand-light': hslCss(light),
    '--color-brand-subtle': hslCss(subtle),
    '--color-page': hslCss(page),
    '--color-card': hslCss(card),
    '--color-inset': hslCss(inset),
    '--color-border': hslCss(border),
    '--color-border-strong': hslCss(borderStrong),
    // shadcn tokens are consumed via hsl(var(--x)) → bare "H S% L%" triplets.
    '--primary': hslTriplet(base),
    '--ring': hslTriplet(base),
    '--secondary': hslTriplet(subtle),
    '--secondary-foreground': hslTriplet(base),
    '--border': hslTriplet(border),
    '--muted': hslTriplet(inset),
    '--card': hslTriplet(card),
    '--background': hslTriplet(page),
  }
}
