// components/app/ZeroState.tsx
import { type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ZeroStateProps {
  icon: LucideIcon
  title: string
  description: string
  ctaLabel: string
  onCta: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

export function ZeroState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
}: ZeroStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-6">
      <div className="w-[120px] h-[120px] rounded-2xl bg-primary-light flex items-center justify-center">
        <Icon size={48} className="text-primary" strokeWidth={1.5} />
      </div>
      <div className="max-w-sm space-y-2">
        <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
        <p className="text-base text-text-secondary leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={onCta}
          className="min-w-[200px] min-h-[44px] px-6 py-3 text-[15px] font-semibold rounded-xl
            bg-primary text-white hover:bg-primary-dark transition-colors duration-150"
        >
          {ctaLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}
