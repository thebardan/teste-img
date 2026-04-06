'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-white">
        <h2 className="text-xl font-semibold text-red-500">Algo deu errado</h2>
        <button
          onClick={reset}
          className="rounded bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
