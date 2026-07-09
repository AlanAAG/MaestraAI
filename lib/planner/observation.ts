// Observation-calendar helpers. Alejandra's rules: 2 kids per day, first names only.

export const OBS_DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const

/** First name only; disambiguate duplicates with the last-name initial ("Regina L."). */
export function toFirstNames(fullNames: string[]): string[] {
  const firsts = fullNames.map((n) => n.trim().split(/\s+/)[0] || n.trim())
  return firsts.map((f, i) => {
    const dup = firsts.some((o, j) => j !== i && o.toLowerCase() === f.toLowerCase())
    if (!dup) return f
    const last = fullNames[i].trim().split(/\s+/)[1]
    return last ? `${f} ${last[0].toUpperCase()}.` : f
  })
}

/** Render-time strip for stored full names (old plans). */
export function displayFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

/** Distribute the roster 2 per day across lunes–viernes, cycling until everyone is scheduled. */
export function distributeObservations(names: string[], perDay = 2): Record<string, string[]> {
  const cal: Record<string, string[]> = {}
  for (const d of OBS_DAYS) cal[d] = []
  names.forEach((n, i) => {
    cal[OBS_DAYS[Math.floor(i / perDay) % OBS_DAYS.length]].push(n)
  })
  return cal
}
