import { AppShell } from '@/components/layout/app-shell'
import { TemplateDetailClient } from './template-detail-client'

export default function TemplateDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <TemplateDetailClient id={params.id} />
    </AppShell>
  )
}
