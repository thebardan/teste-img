import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-standard bg-black/[0.04] dark:bg-white/[0.06] relative overflow-hidden animate-shimmer',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
