// Class-files bucket helpers. Paths carry their own ACL scope:
//   g/<groupId>/<uuid>-<name>            → post attachments (teacher writes; group community reads)
//   s/<postId>/<studentId>/<uuid>-<name> → tarea submissions (family writes; teacher + family read)

export const CLASS_FILES_BUCKET = 'class-files'
export const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
])
export const MAX_FILE_BASE64 = 8 * 1024 * 1024 // ~6MB file

/** Storage-safe filename: Supabase object keys reject non-ASCII and odd punctuation
 * ("Actividades Diagnóstico.pdf" → InvalidKey). Accents are transliterated, spaces become
 * underscores, everything else outside [A-Za-z0-9._-] is dropped. The HUMAN name is stored
 * separately for display — this only shapes the key. */
export function safeFileName(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics: ó → o, ñ → n
    .replace(/[/\\]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+/, '')
  return ascii.slice(0, 100) || 'archivo'
}

export type FileScope =
  | { kind: 'post'; groupId: string }
  | { kind: 'submission'; postId: string; studentId: string }
  | { kind: 'plan'; teacherId: string }

/** Parse a storage path back into its ACL scope. Null = unrecognized (deny). */
export function parseFilePath(path: string): FileScope | null {
  const parts = path.split('/')
  if (parts[0] === 'g' && parts.length === 3 && parts[1] && parts[2]) {
    return { kind: 'post', groupId: parts[1] }
  }
  if (parts[0] === 's' && parts.length === 4 && parts[1] && parts[2] && parts[3]) {
    return { kind: 'submission', postId: parts[1], studentId: parts[2] }
  }
  // Plan annexes (worksheets/reference files attached at creation) — owner teacher only.
  if (parts[0] === 'pa' && parts.length === 3 && parts[1] && parts[2]) {
    return { kind: 'plan', teacherId: parts[1] }
  }
  return null
}
