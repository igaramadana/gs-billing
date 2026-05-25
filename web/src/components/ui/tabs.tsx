import * as React from 'react'
import { cn } from '../../lib/utils'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  items: Array<{
    value: string
    label: string
  }>
}

export function Tabs({ value, onValueChange, items }: TabsProps) {
  return (
    <div className="flex rounded-2xl border border-white/10 bg-black/25 p-1">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onValueChange(item.value)}
          className={cn(
            'h-10 flex-1 rounded-xl px-3 font-geist text-xs font-semibold transition',
            value === item.value
              ? 'bg-brand text-black shadow-glow'
              : 'text-white/55 hover:bg-white/5 hover:text-white'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}