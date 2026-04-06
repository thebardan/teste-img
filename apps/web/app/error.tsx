'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold text-red-500">Algo deu errado</h2>
      <button
        onClick={reset}
        className="rounded bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
      >
        Tentar novamente
      </button>
    </div>
  )
}
