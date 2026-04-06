import { AppShell } from '@/components/layout/app-shell'

export default function JobsPage() {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Monitor de Jobs</h1>
        <p className="mt-2 text-muted-foreground">Acompanhe o status dos jobs de geração.</p>
      </div>
    </AppShell>
  )
}
