// lib/students/name.ts
// Student names live ONLY as encrypted columns (first_name_encrypted/last_name_encrypted).
// There is no plaintext display_name column — decrypt server-side wherever a name is shown.

import { decrypt } from '@/lib/encryption'

type EncryptedNameRow = {
  first_name_encrypted?: string | null
  last_name_encrypted?: string | null
}

export async function decryptName(
  row: EncryptedNameRow
): Promise<{ first: string; last: string; name: string }> {
  const first = row.first_name_encrypted ? await decrypt(row.first_name_encrypted) : ''
  const last = row.last_name_encrypted ? await decrypt(row.last_name_encrypted) : ''
  return { first, last, name: `${first} ${last}`.trim() }
}

// Normalize a name to Title Case for consistent STORAGE. Richmond sends names as ALL CAPS /
// lowercase / Mixed; storing them normalized keeps one canonical row per student. Matching is
// still done case-insensitively elsewhere, so normalization never breaks Richmond linking.
export function normalizeName(s: string): string {
  return (s || '')
    .toLocaleLowerCase('es-MX')
    .replace(/(^|[\s'-])([^\s'-])/g, (_, sep, ch) => sep + ch.toLocaleUpperCase('es-MX'))
    .trim()
}
