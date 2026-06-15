// content.js - Intercepts Richmond markbook XHRs and forwards them to the
// background service worker, which posts them to the MaestraAI ingest API.

let GROUP_UUID_MAP = {}
let isInitialized = false
// Payloads that arrive before group mappings are loaded are queued here and
// replayed once loadGroupMappings() resolves.
const pendingPayloads = []

async function loadGroupMappings() {
  try {
    const { apiKey, apiUrl } = await chrome.storage.sync.get(['apiKey', 'apiUrl'])

    if (!apiKey) {
      console.warn('[MaestraAI] API key not configured')
      return
    }

    // Route through background service worker — content scripts are subject to CORS,
    // the service worker bypasses it for URLs in host_permissions.
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'FETCH_GROUPS', apiKey, apiUrl }, resolve)
    })

    if (!result?.ok) {
      console.error('[MaestraAI] Failed to load groups:', result?.statusCode, result?.error)
      return
    }

    GROUP_UUID_MAP = result.data.groupMap || {}
    isInitialized = true

    console.log('[MaestraAI] Connected as:', result.data.teacherName, '—', result.data.totalGroups, 'groups')

    if (pendingPayloads.length > 0) {
      console.log('[MaestraAI] Draining', pendingPayloads.length, 'queued payload(s)')
      pendingPayloads.splice(0).forEach(({ groupSlug, data }) => {
        sendToBackground(groupSlug, data)
      })
    }
  } catch (error) {
    console.error('[MaestraAI] Failed to load group mappings:', error)
  }
}

function sendToBackground(groupSlug, data) {
  const groupId = GROUP_UUID_MAP[groupSlug]
  if (!groupId) {
    console.warn('[MaestraAI] No mapping for slug:', groupSlug, '— known slugs:', Object.keys(GROUP_UUID_MAP))
    return
  }
  if (!Array.isArray(data) || data.length === 0) return
  console.log('[MaestraAI] Sending', data.length, 'assignment(s) for', groupSlug)
  chrome.runtime.sendMessage({ type: 'ASSIGNMENT_SCORES_INTERCEPTED', groupId, groupSlug, data })
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && (changes.apiKey || changes.apiUrl)) {
    console.log('[MaestraAI] Config changed, reloading group mappings...')
    isInitialized = false
    loadGroupMappings()
  }
})

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'RELOAD_MAPPINGS') {
    isInitialized = false
    loadGroupMappings()
  }
})

loadGroupMappings()

// Override XMLHttpRequest to intercept Richmond markbook API responses
const OriginalXHR = window.XMLHttpRequest
const CustomXHR = function () {
  const xhr = new OriginalXHR()
  const originalOpen = xhr.open

  xhr.open = function (method, url, ...args) {
    const urlStr = String(url)

    if (urlStr.includes('/api/course_modules/') && urlStr.includes('/assignment_scores.json')) {
      const originalOnLoad = xhr.onload
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText)
            const slugMatch = window.location.pathname.match(/\/courses\/([^/]+)\//)
            const groupSlug = slugMatch ? slugMatch[1] : null
            if (!groupSlug) {
              console.warn('[MaestraAI] Could not extract group slug from URL:', window.location.pathname)
              return
            }

            if (!isInitialized) {
              pendingPayloads.push({ groupSlug, data })
              console.log('[MaestraAI] Queued payload — group mappings not ready yet')
            } else {
              sendToBackground(groupSlug, data)
            }
          } catch (error) {
            console.error('[MaestraAI] Failed to parse markbook response:', error)
          }
        }
        if (originalOnLoad) originalOnLoad.apply(this, arguments)
      }
    }

    return originalOpen.apply(this, [method, url, ...args])
  }

  return xhr
}

window.XMLHttpRequest = CustomXHR

console.log('[MaestraAI] Content script loaded — watching Richmond markbook XHRs')
