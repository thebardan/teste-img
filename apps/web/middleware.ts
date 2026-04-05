import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Protect all app routes except auth pages and public assets.
 * Unauthenticated users are redirected to /auth/signin.
 */
export default withAuth(
  function middleware(req: NextRequest) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token
      },
    },
  },
)

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /auth/* (sign-in page)
     * - /api/auth/* (NextAuth routes)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /robots.txt, static files
     */
    '/((?!auth/|api/auth/|_next/static|_next/image|favicon\\.ico|robots\\.txt).*)',
  ],
}
