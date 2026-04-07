import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 animate-fade-in', className)}>
      <Icon className="h-10 w-10 text-fg-tertiary mb-4" strokeWidth={1.2} />
      <h3 className="text-body font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1 text-caption text-fg-secondary max-w-xs text-center">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
