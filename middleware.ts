import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware'

// Routes that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/planeaciones',
  '/configuracion',
  '/vocabulario',
  '/materiales',
  '/alumnos',
  '/richmond',
  '/calificaciones-richmond',
  '/onboarding',
  '/diario',
  '/perfil',
  '/red',
  '/familia',
]

// Public sub-paths of otherwise-protected prefixes (parent invite landing must work logged-out).
const PUBLIC_EXCEPTIONS = ['/familia/invitacion']

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  const csp = [
    "default-src 'self'",
    // googletagmanager/facebook — GTM container + tags (GA4/Pixel); inert unless NEXT_PUBLIC_GTM_ID is set
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://www.googletagmanager.com https://connect.facebook.net",
    "style-src 'self' 'unsafe-inline'",
    // blob: — client-side image processing (docx→vocab thumbnails: object URLs + canvas)
    "img-src 'self' data: https: blob:",
    // worker-src — libs that spin up a blob worker (e.g. zip/image decode) during that flow
    "worker-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://vercel.live https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.facebook.com",
    // GTM noscript iframe + preview mode
    "frame-src 'self' https://www.googletagmanager.com https://vercel.live",
    "frame-ancestors 'none'",
  ].join('; ')
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  // ── 1. CSRF: reject cross-origin state-mutating API requests ─────────────
  // Bearer-token authenticated requests (Chrome extension) are exempt.
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      const origin = req.headers.get('origin')
      if (origin) {
        const host = req.headers.get('host') || ''
        try {
          const originHost = new URL(origin).hostname
          const appHost = new URL(`https://${host}`).hostname
          if (originHost !== appHost) {
            return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 })
          }
        } catch {
          return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 })
        }
      } else if (req.headers.get('cookie')) {
        // No Origin but carrying cookies: browsers always send Origin on cross-origin AND
        // same-origin POSTs, so a cookie-bearing mutation without one is not a normal browser
        // request — reject instead of silently skipping the check.
        return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 })
      }
    }
  }

  // ── 2. API + auth callback: pass through without session interference ────────
  if (pathname.startsWith('/api/') || pathname === '/auth/callback') {
    return applySecurityHeaders(NextResponse.next())
  }

  // ── 3. Supabase session refresh for page routes ───────────────────────────
  const { supabaseResponse, user } = await createSupabaseMiddlewareClient(req)

  // ── 4. Auth guard: redirect unauthenticated users from protected paths ────
  if (
    PROTECTED_PATHS.some((p) => pathname.startsWith(p)) &&
    !PUBLIC_EXCEPTIONS.some((p) => pathname.startsWith(p)) &&
    !user
  ) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    const redirect = NextResponse.redirect(loginUrl)
    // Forward refreshed session cookies so the login page has them
    supabaseResponse.cookies
      .getAll()
      .forEach(({ name, value }) => redirect.cookies.set(name, value))
    return applySecurityHeaders(redirect)
  }

  return applySecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
