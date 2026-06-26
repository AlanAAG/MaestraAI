// inject.js — runs in the page's MAIN world (see manifest content_scripts "world": "MAIN").
// A content script in the default ISOLATED world cannot see the page's XMLHttpRequest/fetch,
// so the markbook interception MUST live here. Captured responses are handed to the isolated
// content script (content.js) via window.postMessage — the only channel between the two worlds.
(function () {
  const MATCH = (url) =>
    typeof url === 'string' && (
      (url.includes('/api/course_modules/') && url.includes('assignment_scores')) ||
      url.includes('/api/scoresheets') ||
      url.includes('/api/markbook')
    )

  // Diagnostics: flip to true (or set window.__MAESTRAAI_DEBUG = true) to log Richmond's
  // payload field names while confirming the ingest mapping. Off by default — keeps the
  // console quiet and avoids logging student data in production.
  const DEBUG = false

  function emit(payload) {
    if (DEBUG || window.__MAESTRAAI_DEBUG) {
      const sample = Array.isArray(payload) ? payload[0] : payload
      const firstStudents = sample && (sample.students || sample.scores || sample.student_scores)
      console.log('[MaestraIA] Assignment keys:', sample ? Object.keys(sample) : 'none')
      console.log('[MaestraIA] First student object:', JSON.stringify(firstStudents && firstStudents[0]))
    }
    // Same-origin postMessage; content.js validates origin + the source tag.
    window.postMessage({ source: 'maestraai-richmond', payload, path: location.pathname }, location.origin)
  }

  // --- patch XMLHttpRequest ---
  const OriginalXHR = window.XMLHttpRequest
  function PatchedXHR() {
    const xhr = new OriginalXHR()
    const open = xhr.open
    xhr.open = function (method, url, ...rest) {
      if (MATCH(String(url))) {
        xhr.addEventListener('load', function () {
          if (xhr.status === 200) {
            try {
              emit(JSON.parse(xhr.responseText))
            } catch {
              /* not JSON — ignore */
            }
          }
        })
      }
      return open.apply(this, [method, url, ...rest])
    }
    return xhr
  }
  window.XMLHttpRequest = PatchedXHR

  // --- patch fetch (Richmond may use either) ---
  const originalFetch = window.fetch
  window.fetch = async function (input, init) {
    const res = await originalFetch(input, init)
    try {
      const url = typeof input === 'string' ? input : input && input.url
      if (MATCH(url) && res.ok) {
        res
          .clone()
          .json()
          .then(emit)
          .catch(() => {})
      }
    } catch {
      /* ignore */
    }
    return res
  }
})()
