'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

function Modal({ open, onClose, children, className }: ModalProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      {/* Modal panel */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-standard bg-surface p-6 shadow-card animate-scale-in max-h-[85vh] overflow-y-auto',
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-fg-tertiary hover:text-fg hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  )
}

function ModalTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-tile font-semibold pr-8', className)} {...props} />
}

function ModalDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-body text-fg-secondary', className)} {...props} />
}

function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex items-center justify-end gap-3', className)} {...props} />
}

export { Modal, ModalTitle, ModalDescription, ModalFooter }
