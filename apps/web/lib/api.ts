import { getSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
const API_SECRET = process.env.API_SECRET ?? ''

/**
 * Authenticated fetch wrapper for the internal API.
 * - Passes X-Api-Key for server-level authentication
 * - Passes X-User-Email and X-User-Role from the active NextAuth session for RBAC
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const session = await getSession()

  const authHeaders: Record<string, string> = {}
  if (API_SECRET) authHeaders['x-api-key'] = API_SECRET
  if (session?.user) {
    const user = session.user as { email?: string; role?: string }
    if (user.email) authHeaders['x-user-email'] = user.email
    if (user.role) authHeaders['x-user-role'] = user.role
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`API error ${res.status}: ${error}`)
  }

  return res.json()
}

/**
 * Server-side fetch for use in Next.js Server Components and Route Handlers.
 * Uses the API_SECRET directly — no session lookup needed server-side.
 */
export async function apiFetchServer<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (API_SECRET) headers['x-api-key'] = API_SECRET

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`API error ${res.status}: ${error}`)
  }

  return res.json()
}
