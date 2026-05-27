'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

type CheckboxProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Checkbox({ checked, onCheckedChange, disabled, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-colors ${
        checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white'
      } ${className || ''}`}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  )
}
