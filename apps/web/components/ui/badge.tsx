import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Apple DS: Minimal badges. No heavy colors.
 * Text-level indicators with subtle background.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-pill px-2 py-0.5 text-micro font-semibold tracking-tight transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-black/[0.06] text-fg-secondary dark:bg-white/[0.1] dark:text-fg',
        accent: 'bg-accent/10 text-accent',
        success: 'bg-success/10 text-success',
        danger: 'bg-danger/10 text-danger',
        warning: 'bg-warning/10 text-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge, badgeVariants }
