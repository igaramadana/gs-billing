import * as React from 'react'
import { cn } from '../../lib/utils'

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 font-geist text-sm text-white',
        'placeholder:text-white/35 outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10',
        className
      )}
      {...props}
    />
  )
}