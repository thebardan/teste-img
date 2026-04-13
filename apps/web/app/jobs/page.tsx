import { AppShell } from '@/components/layout/app-shell'
import { JobsClient } from './jobs-client'

export default function JobsPage() {
  return (
    <AppShell>
      <JobsClient />
    </AppShell>
  )
}
