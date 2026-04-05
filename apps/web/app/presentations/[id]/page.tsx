import { AppShell } from '@/components/layout/app-shell'
import { PresentationDetailClient } from './presentation-detail-client'

export default function PresentationDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <PresentationDetailClient id={params.id} />
    </AppShell>
  )
}
