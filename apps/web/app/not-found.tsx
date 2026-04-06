import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold text-zinc-300">Página não encontrada</h2>
      <Link href="/" className="rounded bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600">
        Voltar ao início
      </Link>
    </div>
  )
}
