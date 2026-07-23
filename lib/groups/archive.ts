// Group archiving ("Nuevo ciclo escolar") — the active/archived split.
// ponytail: filtering happens in JS, not SQL, on purpose — queries select('*') and a missing
// archived_at column (migration 067 not applied yet) simply reads as undefined = active,
// so the app never breaks pre-migration. Teachers have a handful of groups; cost is nil.

export type Archivable = { archived_at?: string | null }

export function activeGroups<T extends Archivable>(groups: T[]): T[] {
  return groups.filter((g) => !g.archived_at)
}

export function archivedGroups<T extends Archivable>(groups: T[]): T[] {
  return groups.filter((g) => !!g.archived_at)
}
