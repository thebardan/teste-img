import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
const API_SECRET = process.env.API_SECRET ?? ''

/**
 * Fetch the user's role from the internal API.
 * Returns 'VIEWER' as fallback if the user is not found or the call fails.
 */
async function fetchUserRole(email: string): Promise<string> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (API_SECRET) headers['x-api-key'] = API_SECRET

    const res = await fetch(
      `${API_URL}/users/by-email?email=${encodeURIComponent(email)}`,
      { headers },
    )
    if (!res.ok) return 'VIEWER'
    const user = (await res.json()) as { role?: string }
    return user.role ?? 'VIEWER'
  } catch {
    return 'VIEWER'
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? 'dev',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'dev',
    }),
    ...(process.env.NODE_ENV === 'development'
      ? [
          CredentialsProvider({
            id: 'dev-test',
            name: 'Dev User',
            credentials: {},
            async authorize() {
              return {
                id: 'dev-user-1',
                name: 'Dev User',
                email: 'dev@multilaser.com.br',
                image: null,
              }
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, fetch and cache the role in the token
      if (user?.email && !token.role) {
        token.role = await fetchUserRole(user.email)
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { id?: string; role?: string }
        if (token.sub) u.id = token.sub
        if (token.role) u.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}
