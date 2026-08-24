// Subdomain white-label: <slug>.maestraia.com|mx is a school's front door.
// Returns the slug for school subdomains, null for everything else (apex, www,
// reserved names, vercel previews, localhost).

const RESERVED = new Set(['www', 'diario', 'app', 'api', 'mail', 'admin', 'staging', 'dev'])
const HOST_RE = /^([a-z0-9][a-z0-9-]{1,30})\.maestra(?:ia|ai)\.(?:com|mx)$/

export function schoolSlugFromHost(host: string | null): string | null {
  if (!host) return null
  const m = host.toLowerCase().split(':')[0].match(HOST_RE)
  if (!m) return null
  const slug = m[1]
  return RESERVED.has(slug) ? null : slug
}
