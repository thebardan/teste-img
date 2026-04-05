import { ProductsClient } from './products-client'
import { AppShell } from '@/components/layout/app-shell'

export default function ProductsPage() {
  return (
    <AppShell>
      <ProductsClient />
    </AppShell>
  )
}
