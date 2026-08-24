import { describe, expect, it } from 'vitest'
import { isAllowedPushEndpoint } from './allowlist'

describe('isAllowedPushEndpoint', () => {
  it('accepts the major browser push services', () => {
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true)
    expect(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true)
    expect(isAllowedPushEndpoint('https://web.push.apple.com/QOb2...')).toBe(true)
    expect(isAllowedPushEndpoint('https://db5p.notify.windows.com/w/?token=x')).toBe(true)
  })
  it('rejects SSRF attempts', () => {
    expect(isAllowedPushEndpoint('http://fcm.googleapis.com/x')).toBe(false) // not https
    expect(isAllowedPushEndpoint('https://10.0.0.1/internal')).toBe(false)
    expect(isAllowedPushEndpoint('https://evil.com/fcm.googleapis.com')).toBe(false)
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com.evil.com/x')).toBe(false)
    expect(isAllowedPushEndpoint('not-a-url')).toBe(false)
  })
})
