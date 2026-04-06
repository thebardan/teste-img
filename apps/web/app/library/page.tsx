import { AppShell } from '@/components/layout/app-shell'

export default function LibraryPage() {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Biblioteca de Materiais</h1>
        <p className="mt-2 text-muted-foreground">Acesse todos os materiais gerados e aprovados.</p>
      </div>
    </AppShell>
  )
}
