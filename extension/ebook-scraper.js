// ebook-scraper.js
// NOTE: This file is no longer active. E-book XHR interception was moved into
// content.js so it fires on all Richmond course pages, not just when the browser
// navigates directly to the raw API URL (which teachers never do).
// Kept for reference; not listed in manifest.json content_scripts.

;(function () {
  const uuid = window.location.pathname.split('/').pop()
  if (!uuid) return

  async function captureContent() {
    let content = null

    // Primary: the page body is raw JSON (browser opened an API endpoint directly)
    try {
      const text = document.body?.innerText?.trim()
      if (text && (text.startsWith('{') || text.startsWith('['))) {
        content = JSON.parse(text)
      }
    } catch (_) {
      // not JSON in body
    }

    // Fallback: re-fetch the same URL with the browser's existing session cookies
    if (!content) {
      try {
        const res = await fetch(window.location.href, { credentials: 'include' })
        if (res.ok) content = await res.json()
      } catch (_) {
        // fetch failed
      }
    }

    if (!content) {
      console.warn('[MaestraAI] Could not capture e-book content for UUID:', uuid)
      return
    }

    // Try common field names for the unit title across different Richmond API shapes
    const title =
      content.title ||
      content.name ||
      content.unit_name ||
      content.lessonName ||
      content.lesson_title ||
      content.unitTitle ||
      null

    console.log('[MaestraAI] Captured e-book content — UUID:', uuid, 'Title:', title)

    chrome.runtime.sendMessage({
      type: 'EBOOK_CONTENT_INTERCEPTED',
      uuid,
      title: title ? String(title) : null,
      content,
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', captureContent)
  } else {
    captureContent()
  }
})()
