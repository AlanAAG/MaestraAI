'use client'
// Top-left brand for the teacher shell: the school's logo when one is set, "MaestraIA"
// otherwise. Reuses GET /api/school/logo (any teacher of the school can read it).
import { useEffect, useState } from 'react'

export function SchoolLogoBrand({ textClassName }: { textClassName: string }) {
  const [logo, setLogo] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/school/logo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLogo(d?.logo_url ?? null))
      .catch(() => {})
  }, [])

  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="Logo de la escuela" className="h-8 w-auto object-contain" />
  }
  return <span className={textClassName}>MaestraIA</span>
}
