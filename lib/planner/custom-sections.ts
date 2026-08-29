/**
 * Add / remove custom sections without corrupting the document.
 *
 * `_section_order` addresses custom sections **by index** ('custom:0', 'custom:1', …),
 * so the array and the order list have to move together:
 *  - a section appended to `custom_sections` but absent from `_section_order` never
 *    renders (PlanDocumentViewer only walks the order list);
 *  - a section spliced out shifts every later index, so untouched 'custom:N' entries
 *    would silently start pointing at the wrong section.
 *
 * Both operations live here, tested, instead of inline in the chat route.
 */
export type CustomSection = { title: string; content: string }

type Doc = Record<string, unknown>

const readCustom = (doc: Doc): CustomSection[] =>
  Array.isArray(doc.custom_sections) ? (doc.custom_sections as CustomSection[]) : []

const readOrder = (doc: Doc): string[] =>
  Array.isArray(doc._section_order) ? (doc._section_order as string[]) : []

/** Parses 'custom:3' → 3; returns null for a normal field key. */
function customIndex(key: string): number | null {
  if (!key.startsWith('custom:')) return null
  const n = parseInt(key.slice(7), 10)
  return Number.isNaN(n) ? null : n
}

/**
 * Appends a custom section and registers it in the render order.
 *
 * Placed at the end of the order — the teacher can move it from the document
 * view; guessing a position from a chat message would be worse than predictable.
 */
export function addCustomSection(doc: Doc, section: CustomSection): Doc {
  const custom = [...readCustom(doc), section]
  const order = readOrder(doc)
  const nextKey = `custom:${custom.length - 1}`

  return {
    ...doc,
    custom_sections: custom,
    // Only materialise _section_order if the document already had one: an absent
    // order means "use the default", and inventing a partial list here would drop
    // every standard section from the render.
    ...(order.length ? { _section_order: [...order, nextKey] } : {}),
  }
}

/**
 * Removes the custom section at `index`, re-indexing the order list.
 *
 * Returns the document unchanged if the index doesn't exist, so a bad tool call
 * is a no-op rather than a corrupted plan.
 */
export function removeCustomSection(doc: Doc, index: number): Doc {
  const custom = readCustom(doc)
  if (index < 0 || index >= custom.length) return doc

  const next = custom.filter((_, i) => i !== index)
  const order = readOrder(doc)

  const reindexed = order
    .filter((key) => customIndex(key) !== index)
    .map((key) => {
      const i = customIndex(key)
      // Everything after the removed slot shifts down by one.
      return i !== null && i > index ? `custom:${i - 1}` : key
    })

  return {
    ...doc,
    custom_sections: next,
    ...(order.length ? { _section_order: reindexed } : {}),
  }
}

/** Finds a custom section by title (case/accent-insensitive), for resolving a chat request. */
export function findCustomSection(doc: Doc, title: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      // eslint-disable-next-line no-control-regex
      .replace(/[̀-ͯ]/g, '')
      .trim()
  const target = norm(title)
  return readCustom(doc).findIndex((cs) => norm(cs.title ?? '') === target)
}

/** Titles of the current custom sections, for showing the model what exists. */
export function listCustomSections(doc: Doc): string[] {
  return readCustom(doc).map((cs) => cs.title ?? '')
}
