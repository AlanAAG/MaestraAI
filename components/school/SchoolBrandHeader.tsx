// White-label header: the school's logo + name when a brand exists, "MaestraIA" otherwise.
// Presentational, server-renderable. brandColor feeds --color-primary for the page below it.
import type { SchoolBrand } from '@/lib/school/brand'

export function SchoolBrandHeader({
  brand,
  subtitle,
}: {
  brand: SchoolBrand | null
  subtitle?: string
}) {
  return (
    <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-center gap-3">
      {brand?.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt={brand.name} className="h-9 w-auto object-contain" />
      )}
      <div className="text-center">
        <span
          className="text-sm font-semibold"
          style={{ color: brand?.brandColor ?? 'var(--color-primary, #6366f1)' }}
        >
          {brand?.name ?? 'MaestraIA'}
        </span>
        {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
      </div>
    </header>
  )
}
