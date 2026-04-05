import { ProductDetailClient } from './product-detail-client'
import { AppShell } from '@/components/layout/app-shell'

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <ProductDetailClient id={params.id} />
    </AppShell>
  )
}
