export const EDITORIAL_REGISTRY = {
  richmond: { label: 'Richmond LP', has_lms_sync: true, sync_path: '/dashboard/richmond' },
  macmillan: { label: 'Macmillan Education', has_lms_sync: false, sync_path: null },
  pearson: { label: 'Pearson', has_lms_sync: false, sync_path: null },
  oxford: { label: 'Oxford University Press', has_lms_sync: false, sync_path: null },
  cambridge: { label: 'Cambridge', has_lms_sync: false, sync_path: null },
  other: { label: 'Otro editorial', has_lms_sync: false, sync_path: null },
} as const

export type EditorialKey = keyof typeof EDITORIAL_REGISTRY
type EditorialConfig = { label: string; has_lms_sync: boolean; sync_path: string | null }

export function getEditorialConfig(key: string | null | undefined): EditorialConfig {
  const k = (key ?? '').toLowerCase() as EditorialKey
  return EDITORIAL_REGISTRY[k] ?? { label: key ?? '', has_lms_sync: false, sync_path: null }
}

export const EDITORIAL_OPTIONS = (
  Object.entries(EDITORIAL_REGISTRY) as [EditorialKey, EditorialConfig][]
).map(([value, { label }]) => ({ value, label }))
