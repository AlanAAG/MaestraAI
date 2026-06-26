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
]

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://vercel.live",
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
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !user) {
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
