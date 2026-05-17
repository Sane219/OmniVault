import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth is now handled client-side via OS dialog overlay.
// No server-side route protection needed — all content is on a single route.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
