// content.js - Intercepts Richmond API calls for assignment scores

const GROUP_UUID_MAP = {
  'grupo-aca6e': '91000000-0000-0000-0000-000000000001', // Preprimaria A
  'grupo-b01f6': '92000000-0000-0000-0000-000000000002', // Preprimaria B
}

// Override XMLHttpRequest to intercept API calls
const OriginalXHR = window.XMLHttpRequest
const CustomXHR = function () {
  const xhr = new OriginalXHR()
  const originalOpen = xhr.open

  xhr.open = function (method, url, ...args) {
    // Detect assignment_scores API calls
    if (
      url.includes('/api/course_modules/') &&
      url.includes('/assignment_scores.json')
    ) {
      const originalOnLoad = xhr.onload

      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText)

            // Extract group slug from page URL
            const pageUrl = window.location.pathname
            const groupMatch = pageUrl.match(/\/courses\/(grupo-[a-z0-9]+)\//)
            const groupSlug = groupMatch ? groupMatch[1] : null
            const groupId = groupSlug ? GROUP_UUID_MAP[groupSlug] : null

            if (groupId && Array.isArray(data)) {
              console.log('[MaestraAI] Intercepted assignment scores:', data.length, 'assignments')

              // Send to background script
              chrome.runtime.sendMessage({
                type: 'ASSIGNMENT_SCORES_INTERCEPTED',
                groupId,
                groupSlug,
                data,
              })
            }
          } catch (error) {
            console.error('[MaestraAI] Failed to parse assignment scores:', error)
          }
        }

        if (originalOnLoad) {
          originalOnLoad.apply(this, arguments)
        }
      }
    }

    return originalOpen.apply(this, [method, url, ...args])
  }

  return xhr
}

window.XMLHttpRequest = CustomXHR

console.log('[MaestraAI] Content script loaded - intercepting Richmond API calls')
