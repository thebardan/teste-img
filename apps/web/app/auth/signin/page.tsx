'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border p-8">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="h-3 w-3 rounded-full bg-primary" />
          </div>
          <h1 className="text-xl font-bold">Multi AI Studio</h1>
          <p className="text-sm text-muted-foreground">
            Plataforma interna de marketing com IA
          </p>
        </div>
        <button
          onClick={() => signIn('google', { callbackUrl })}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Entrar com Google
        </button>
      </div>
    </div>
  )
}
