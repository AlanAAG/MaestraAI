// Client-side Sentry is initialized ONCE in `instrumentation-client.ts` (the current
// @sentry/nextjs convention). This legacy file intentionally does NOT call Sentry.init()
// to avoid the "Sentry.init() called more than once on the client" double-initialization.
export {}
