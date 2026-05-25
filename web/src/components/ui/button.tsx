import * as React from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-geist font-semibold transition-all disabled:pointer-events-none disabled:opacity-50',
        'focus:outline-none focus:ring-2 focus:ring-brand/40',
        size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm',
        variant === 'default' &&
          'bg-brand text-black hover:bg-brand/90 shadow-glow',
        variant === 'ghost' &&
          'bg-white/5 text-white hover:bg-white/10 border border-white/10',
        variant === 'danger' &&
          'bg-red-500/15 text-red-200 hover:bg-red-500/25 border border-red-500/20',
        className
      )}
      {...props}
    />
  )
}