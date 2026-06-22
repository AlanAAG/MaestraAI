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
      chrome.runtime.sendMessage({ type: 'FETCH_GROUPS', apiKey, apiUrl }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[MaestraAI] Service worker inactive:', chrome.runtime.lastError.message)
          resolve({ ok: false, error: 'service_worker_inactive' })
        } else {
          resolve(response)
        }
      })
    })

    if (!result?.ok) {
      console.error('[MaestraAI] Failed to load groups:', result?.statusCode, result?.error)
      return
    }

    GROUP_UUID_MAP = result.data.groupMap || {}
    isInitialized = true

    if (pendingPayloads.length > 0) {
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
  if (!groupId) return // no mapping for this Richmond course — nothing to sync
  if (!Array.isArray(data) || data.length === 0) return
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

// Receive markbook payloads captured by inject.js (MAIN world). This isolated-world
// script can't intercept the page's XHR/fetch itself, so it listens for the bridge.
window.addEventListener('message', (event) => {
  // Only trust same-window, same-origin messages carrying our tag.
  if (event.source !== window || event.origin !== window.location.origin) return
  const msg = event.data
  if (!msg || msg.source !== 'maestraai-richmond' || !msg.payload) return

  const slugMatch = String(msg.path || window.location.pathname).match(/\/courses\/([^/]+)\//)
  const groupSlug = slugMatch ? slugMatch[1] : null
  if (!groupSlug) return

  if (!isInitialized) {
    pendingPayloads.push({ groupSlug, data: msg.payload })
  } else {
    sendToBackground(groupSlug, msg.payload)
  }
})
