import * as React from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'pending' | 'paid' | 'cancelled' | 'default'
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 font-geist text-[11px] font-semibold uppercase tracking-wide',
        variant === 'default' && 'border-white/10 bg-white/5 text-white/70',
        variant === 'pending' && 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200',
        variant === 'paid' && 'border-brand/20 bg-brand/10 text-brand',
        variant === 'cancelled' && 'border-red-400/20 bg-red-400/10 text-red-200',
        className
      )}
      {...props}
    />
  )
}