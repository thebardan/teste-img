import { AppShell } from '@/components/layout/app-shell'
import { SalesSheetDetailClient } from './sales-sheet-detail-client'

export default function SalesSheetDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <SalesSheetDetailClient id={params.id} />
    </AppShell>
  )
}
