'use client'

// GTM loader + typed event helper. Loads NOTHING unless NEXT_PUBLIC_GTM_ID is set —
// GA4 / Meta Pixel get configured inside the GTM container, not in code.
import Script from 'next/script'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

/** Push a conversion/interaction event to GTM's dataLayer (no-op when GTM is off). */
export function track(event: string, data: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || !window.dataLayer) return
  window.dataLayer.push({ event, ...data })
}

export default function Analytics() {
  if (!GTM_ID) return null
  return (
    <>
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  )
}
