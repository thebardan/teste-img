import { AppShell } from '@/components/layout/app-shell'
import { DriveSyncClient } from './drive-sync-client'

export default function DriveSyncPage() {
  return (
    <AppShell>
      <DriveSyncClient />
    </AppShell>
  )
}
