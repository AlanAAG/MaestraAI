// content.js - Intercepts Richmond API calls for assignment scores

// Dynamic GROUP_UUID_MAP loaded from /api/richmond/groups
let GROUP_UUID_MAP = {}
let isInitialized = false

// Load group mappings from MaestraAI API
async function loadGroupMappings() {
  try {
    const { apiKey, apiUrl } = await chrome.storage.sync.get(['apiKey', 'apiUrl'])

    if (!apiKey || !apiUrl) {
      console.warn('[MaestraAI] API key or URL not configured')
      return
    }

    const response = await fetch(`${apiUrl}/api/richmond/groups`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      console.error('[MaestraAI] Failed to fetch groups:', response.status)
      return
    }

    const data = await response.json()
    GROUP_UUID_MAP = data.groupMap || {}
    isInitialized = true

    console.log('[MaestraAI] Loaded group mappings:', GROUP_UUID_MAP)
    console.log('[MaestraAI] Connected as:', data.teacherName)
    console.log('[MaestraAI] Syncing', data.totalGroups, 'groups')
  } catch (error) {
    console.error('[MaestraAI] Failed to load group mappings:', error)
  }
}

// Listen for storage changes (when API key is updated)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && (changes.apiKey || changes.apiUrl)) {
    console.log('[MaestraAI] API configuration changed, reloading groups...')
    loadGroupMappings()
  }
})

// Load mappings on script initialization
loadGroupMappings()

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

            if (!isInitialized) {
              console.warn('[MaestraAI] Group mappings not loaded yet, skipping sync')
              return
            }

            if (!groupId) {
              console.warn(
                '[MaestraAI] No group mapping found for slug:',
                groupSlug,
                'Available groups:',
                Object.keys(GROUP_UUID_MAP)
              )
              return
            }

            if (groupId && Array.isArray(data)) {
              console.log('[MaestraAI] Intercepted assignment scores:', data.length, 'assignments for', groupSlug)

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

console.log('[MaestraAI] Content script loaded - waiting for group mappings...')
