import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  className?: string
}

export function StatCard({ label, value, icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-lg bg-surface p-5 transition-all duration-300',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary">{label}</p>
        <Icon className="h-4 w-4 text-fg-tertiary" strokeWidth={1.5} />
      </div>
      <p className="text-section font-semibold tracking-tight">{value}</p>
    </div>
  )
}
