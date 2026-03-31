import { AppShell } from '@/components/layout/app-shell'

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Bem-vindo ao Multi AI Studio. Selecione uma opção no menu para começar.
        </p>
      </div>
    </AppShell>
  )
}
