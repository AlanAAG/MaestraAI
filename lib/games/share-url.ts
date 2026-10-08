/** Never send families to localhost because a development variable reached a deployment. */
export function gameShareUrl(
  requestOrigin: string,
  token: string,
  configured = process.env.NEXT_PUBLIC_APP_URL
): string {
  const request = new URL(requestOrigin)
  let origin = request.origin
  if (configured) {
    try {
      const candidate = new URL(configured)
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(candidate.hostname)
      if (candidate.protocol === 'https:' && !local) origin = candidate.origin
    } catch {
      /* Invalid configuration: the current application origin remains usable. */
    }
  }
  return new URL(`/jugar/${token}`, origin).toString()
}
