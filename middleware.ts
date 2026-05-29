// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''
  const isDiarySite =
    hostname.startsWith('diario.') || process.env.NEXT_PUBLIC_FORCE_DIARY_SITE === 'true'

  // Determine response type
  let response: NextResponse
  if (isDiarySite) {
    const pathname = req.nextUrl.pathname
    // Rewrite / → /diary, /nueva → /diary/nueva, /resultado → /diary/resultado
    const rewritePath = pathname === '/' ? '/diary' : `/diary${pathname}`
    const url = req.nextUrl.clone()
    url.pathname = rewritePath
    response = NextResponse.rewrite(url)
  } else {
    response = NextResponse.next()
  }

  // Security headers (apply to ALL routes)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Content Security Policy - allow Supabase, Anthropic, Vercel
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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
