// content.js - Intercepts Richmond markbook XHRs and forwards them to the
// background service worker, which posts them to the MaestraAI ingest API.

let GROUP_UUID_MAP = {}
let isInitialized = false
// Payloads that arrive before group mappings are loaded are queued here and
// replayed once loadGroupMappings() resolves.
const pendingPayloads = []

// --- In-page badge ---
// ponytail: plain DOM badge, no shadow DOM — add shadow DOM if Richmond's CSS conflicts
let badge = null

function ensureBadge() {
  if (badge) return badge
  badge = document.createElement('div')
  badge.id = 'maestraai-badge'
  badge.style.cssText = [
    'position:fixed', 'top:12px', 'right:12px', 'z-index:2147483647',
    'padding:5px 10px', 'border-radius:20px', 'font-size:12px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'font-weight:600', 'display:flex', 'align-items:center', 'gap:6px',
    'box-shadow:0 2px 8px rgba(0,0,0,.18)', 'transition:background .3s,color .3s',
    'pointer-events:none', 'user-select:none',
  ].join(';')
  document.body.appendChild(badge)
  return badge
}

const BADGE_STYLES = {
  gray:  { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' },
  green: { bg: '#ecfdf5', color: '#166534', dot: '#22c55e' },
  amber: { bg: '#fffbeb', color: '#92400e', dot: '#f59e0b' },
  red:   { bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
}

function setBadge(state, text) {
  const el = ensureBadge()
  const s = BADGE_STYLES[state] || BADGE_STYLES.gray
  el.style.background = s.bg
  el.style.color = s.color
  el.replaceChildren()
  const dot = document.createElement('span')
  dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${s.dot};display:inline-block;flex-shrink:0`
  const label = document.createElement('span')
  label.textContent = text
  el.appendChild(dot)
  el.appendChild(label)
}

let syncResetTimer = null
function setBadgeTemp(state, text, thenState, thenText, ms = 3000) {
  setBadge(state, text)
  clearTimeout(syncResetTimer)
  syncResetTimer = setTimeout(() => setBadge(thenState, thenText), ms)
}

// Show gray badge as soon as DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setBadge('gray', 'MaestraAI'))
} else {
  setBadge('gray', 'MaestraAI')
}

// --- Group mappings ---

async function loadGroupMappings() {
  try {
    const { apiKey, apiUrl } = await chrome.storage.sync.get(['apiKey', 'apiUrl'])

    if (!apiKey) {
      console.warn('[MaestraAI] API key not configured')
      setBadge('amber', 'MaestraAI · Sin clave API')
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
      setBadge('red', 'MaestraAI · Error de conexión')
      return
    }

    GROUP_UUID_MAP = result.data.groupMap || {}
    isInitialized = true

    const mappedCount = Object.keys(GROUP_UUID_MAP).length
    if (mappedCount === 0) {
      setBadge('amber', 'MaestraAI · Sin grupos mapeados')
      console.warn('[MaestraAI] Connected but no groups have richmond_class_code set. Go to Grupos → edit → set Richmond code.')
    } else {
      setBadge('green', `MaestraAI ✓`)
    }

    if (pendingPayloads.length > 0) {
      pendingPayloads.splice(0).forEach(({ groupSlug, data }) => {
        sendToBackground(groupSlug, data)
      })
    }
  } catch (error) {
    console.error('[MaestraAI] Failed to load group mappings:', error)
    setBadge('red', 'MaestraAI · Error')
  }
}

function sendToBackground(groupSlug, data) {
  const groupId = GROUP_UUID_MAP[groupSlug]
  if (!groupId) {
    console.warn('[MaestraAI] No mapping for Richmond slug:', groupSlug, '— known slugs:', Object.keys(GROUP_UUID_MAP))
    return
  }
  if (!Array.isArray(data) || data.length === 0) return
  setBadge('gray', 'MaestraAI · Sincronizando...')
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
  } else if (message.type === 'SYNC_STATUS') {
    if (message.status === 'ok') {
      const label = message.count != null ? `MaestraAI ✓ ${message.count} registros` : 'MaestraAI ✓ Sincronizado'
      const idleLabel = Object.keys(GROUP_UUID_MAP).length > 0 ? 'MaestraAI ✓' : 'MaestraAI · Sin grupos mapeados'
      const idleState = Object.keys(GROUP_UUID_MAP).length > 0 ? 'green' : 'amber'
      setBadgeTemp('green', label, idleState, idleLabel)
    } else {
      setBadgeTemp('red', 'MaestraAI · Error al sincronizar', 'green', 'MaestraAI ✓')
    }
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
