// Flash-free theming. The chosen design (color theme + interface font) is mirrored into a cookie
// so a tiny pre-paint script in the root layout can apply the CSS vars BEFORE first paint —
// eliminating the "flash of default gold before the theme applies" that a client-only useEffect
// causes. The DB (teachers.design_settings) stays the source of truth; the cookie is just a
// fast, server-visible mirror kept in sync whenever the shell reads it or the teacher saves.
import { appThemeVars } from './themes'
import { appFontStack } from './fonts'

export const DESIGN_COOKIE = 'app_design'

/** All CSS custom properties for a teacher's design (color theme + interface font), or {} for defaults. */
export function designStyleVars(
  appColor?: string | null,
  appFont?: string | null
): Record<string, string> {
  const vars: Record<string, string> = { ...(appThemeVars(appColor) ?? {}) }
  const stack = appFontStack(appFont)
  if (stack) {
    // Overriding the next/font vars restyles Tailwind font classes AND the globals h1-h3 rule.
    vars['--font-inter'] = stack
    vars['--font-dm-sans'] = stack
  }
  return vars
}

/** Client-only: mirror the design into the cookie the pre-paint script reads on the next load. */
export function writeDesignCookie(appColor?: string | null, appFont?: string | null): void {
  const val = encodeURIComponent(JSON.stringify(designStyleVars(appColor, appFont)))
  document.cookie = `${DESIGN_COOKIE}=${val}; path=/; max-age=31536000; samesite=lax`
}

// Runs synchronously before paint (inlined first in <body> by the root layout). Reads the cookie
// and applies the design vars to <html>, so there's no flash of the default theme. Raw,
// dependency-free JS on purpose. Idempotent with the client shell's effects.
export const DESIGN_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${DESIGN_COOKIE}=([^;]*)/);if(!m)return;var v=JSON.parse(decodeURIComponent(m[1]));var r=document.documentElement;for(var k in v){if(Object.prototype.hasOwnProperty.call(v,k))r.style.setProperty(k,v[k]);}}catch(e){}})();`
