// ebook-scraper.js
// Captures Richmond LRP interactive (e-book) unit content when the teacher opens a unit.
// Runs on: https://richmondlp.com/api/interactives/*
// The browser navigates directly to the API URL which returns JSON.

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
