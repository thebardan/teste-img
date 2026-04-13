import { AppShell } from '@/components/layout/app-shell'
import { LibraryClient } from './library-client'

export default function LibraryPage() {
  return (
    <AppShell>
      <LibraryClient />
    </AppShell>
  )
}
