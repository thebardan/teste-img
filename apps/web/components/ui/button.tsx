import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-body font-normal transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        /* Apple Blue CTA */
        primary:
          'bg-accent text-white rounded-standard hover:brightness-110 active:bg-btn-active active:text-near-black',
        /* Dark CTA */
        dark:
          'bg-near-black text-white rounded-standard hover:bg-[#333336] active:bg-btn-active active:text-near-black',
        /* Pill link — the signature Apple CTA */
        pill:
          'bg-transparent text-accent-link border border-accent-link rounded-pill hover:bg-accent hover:text-white hover:border-accent',
        /* Ghost / subtle */
        ghost:
          'bg-transparent text-fg-secondary rounded-standard hover:bg-black/[0.04] dark:hover:bg-white/[0.08] active:bg-black/[0.08] dark:active:bg-white/[0.12]',
        /* Danger */
        danger:
          'bg-danger text-white rounded-standard hover:brightness-110',
      },
      size: {
        sm: 'h-8 px-3 text-caption',
        md: 'h-10 px-[15px] text-body',
        lg: 'h-12 px-6 text-body',
        icon: 'h-10 w-10 rounded-standard',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
