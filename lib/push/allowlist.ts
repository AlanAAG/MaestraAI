// Push endpoints are URLs OUR SERVER will POST to (web-push). Without an allowlist any
// authenticated user could register an internal/arbitrary URL and turn every announcement
// into a server-side request to it (SSRF). Browsers only ever hand out endpoints on their
// vendor's push service, so a strict suffix allowlist costs nothing.
const ALLOWED_SUFFIXES = [
  '.googleapis.com', // Chrome/Edge/Brave (fcm.googleapis.com)
  '.push.services.mozilla.com', // Firefox
  '.push.apple.com', // Safari (web.push.apple.com)
  '.notify.windows.com', // legacy Edge (WNS)
]

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  return ALLOWED_SUFFIXES.some((s) => host.endsWith(s))
}
