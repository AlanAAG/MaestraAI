// Shown instantly by Next.js while any /(main) route's data/JS loads — turns a blank/janky wait
// into an immediate skeleton. One file covers every page in the group. ponytail: generic on
// purpose; a page that wants a tailored skeleton can add its own loading.tsx.
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse p-6 sm:p-8">
      <div className="mb-8 h-8 w-52 rounded-lg bg-muted" />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="h-56 rounded-xl bg-muted" />
      </div>
    </div>
  )
}
