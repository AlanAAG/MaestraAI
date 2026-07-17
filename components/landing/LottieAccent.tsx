'use client'

// Drop-in Lottie seam: renders the animation at /public/lottie/<name>.json when the file
// exists, silently renders nothing when it doesn't. Assets are self-hosted (CSP-safe) —
// Alan drops brand .json files in public/lottie/ and they light up with zero code changes.
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

export default function LottieAccent({
  src,
  className = '',
  loop = true,
}: {
  src: string
  className?: string
  loop?: boolean
}) {
  const [data, setData] = useState<object | null>(null)

  useEffect(() => {
    let alive = true
    fetch(src)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        // 'v' is the Lottie schema version field — cheap sanity check that this is a real asset.
        if (alive && d && typeof d === 'object' && 'v' in d) setData(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [src])

  if (!data) return null
  return <Lottie animationData={data} loop={loop} className={className} />
}
