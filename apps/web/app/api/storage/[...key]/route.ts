import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
const API_SECRET = process.env.API_SECRET ?? ''

export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string[] } },
) {
  const key = params.key.join('/')
  const headers: Record<string, string> = {}
  if (API_SECRET) headers['x-api-key'] = API_SECRET

  const res = await fetch(`${API_URL}/storage/stream/${encodeURI(key)}`, {
    headers,
    cache: 'no-store',
  })
  if (!res.ok) {
    return NextResponse.json({ error: `Storage: ${res.status}` }, { status: res.status })
  }
  const body = await res.arrayBuffer()
  return new NextResponse(body, {
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=600',
    },
  })
}
