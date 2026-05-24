// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? ''
  const isDiarySite =
    hostname.startsWith('diario.') ||
    process.env.NEXT_PUBLIC_FORCE_DIARY_SITE === 'true'

  if (isDiarySite) {
    const pathname = req.nextUrl.pathname
    // Rewrite / → /diary, /nueva → /diary/nueva, /resultado → /diary/resultado
    const rewritePath = pathname === '/' ? '/diary' : `/diary${pathname}`
    const url = req.nextUrl.clone()
    url.pathname = rewritePath
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
