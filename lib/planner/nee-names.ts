// Render-time NEE name merge. The plan_document only ever stores anonymized labels ("Alumno A")
// + a names-free `_nee_mapping` (label → student_id). Real names are decrypted and swapped in ONLY
// when rendering the document for the owning teacher (viewer / DOCX / print) — never stored, never
// sent to the LLM, never embedded for RAG. LFPDPPP-safe.

/**
 * Replace anonymized NEE labels with real names in a rendered text block. Pure (no I/O) so it's
 * trivially testable and safe to run client-side once the teacher has fetched the decrypted map.
 */
export function applyNeeNames(text: string, labelToName: Record<string, string>): string {
  if (!text || !labelToName) return text
  // Longest labels first so a shorter label can't partial-match inside a longer one.
  const labels = Object.keys(labelToName).sort((a, b) => b.length - a.length)
  let out = text
  for (const label of labels) {
    const name = labelToName[label]
    if (name) out = out.split(label).join(name)
  }
  return out
}

/**
 * Decrypt a names-free `_nee_mapping` (label → student_id) into label → display name, for the
 * teacher's OWN students (RLS scopes the query). Best-effort: a row that can't be decrypted keeps
 * its anonymized label. `decrypt` is lazy-imported so `applyNeeNames` stays I/O-free for tests.
 */
export async function decryptNeeMap(
  mapping: Record<string, string> | undefined | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<Record<string, string>> {
  if (!mapping || !Object.keys(mapping).length) return {}
  const ids = Array.from(new Set(Object.values(mapping)))
  const { data } = await supabase
    .from('students')
    .select('id, first_name_encrypted, last_name_encrypted')
    .in('id', ids)
  if (!data?.length) return {}

  const { decrypt } = await import('@/lib/encryption')
  const byId: Record<string, string> = {}
  await Promise.all(
    data.map(
      async (r: {
        id: string
        first_name_encrypted: string | null
        last_name_encrypted: string | null
      }) => {
        try {
          const first = r.first_name_encrypted ? await decrypt(r.first_name_encrypted) : ''
          const last = r.last_name_encrypted ? await decrypt(r.last_name_encrypted) : ''
          const name = `${first}${last ? ' ' + last.charAt(0) + '.' : ''}`.trim()
          if (name) byId[r.id] = name
        } catch {
          /* undecryptable → keep anonymized label */
        }
      }
    )
  )

  const out: Record<string, string> = {}
  for (const [label, id] of Object.entries(mapping)) {
    if (byId[id]) out[label] = byId[id]
  }
  return out
}
