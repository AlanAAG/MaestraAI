// Shared font stacks — used by the plan document viewer (design_settings.font) and the
// app-wide interface font (design_settings.app_font).
export type FontKey = 'sans' | 'serif' | 'rounded' | 'century'

export const FONT_MAP: Record<FontKey, string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Baloo 2", "Comic Sans MS", ui-rounded, sans-serif',
  // ponytail: Century Gothic isn't web-safe — rely on the fallback stack (real Century Gothic
  // shows in Word/Office; on screen Futura/Trebuchet is the close cousin). No webfont dependency.
  century: '"Century Gothic", Futura, "Trebuchet MS", "URW Gothic", sans-serif',
}

/** Resolve an app_font value to a CSS stack, or null for default/unknown. */
export function appFontStack(appFont?: string | null): string | null {
  if (!appFont || appFont === 'default') return null
  return FONT_MAP[appFont as FontKey] ?? null
}

/**
 * Full inline style for an app-font wrapper: fontFamily for inherited text PLUS overrides of the
 * next/font CSS vars, because globals.css styles h1-h3 via var(--font-dm-sans) (a direct rule
 * beats inheritance). Both the (main) shell and public /jugar must use this same shape.
 */
export function appFontStyle(appFont?: string | null): React.CSSProperties | undefined {
  const stack = appFontStack(appFont)
  if (!stack) return undefined
  return {
    fontFamily: stack,
    '--font-inter': stack,
    '--font-dm-sans': stack,
  } as React.CSSProperties
}
