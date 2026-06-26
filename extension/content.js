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

// Inject keyframes for the pulse animation once.
function injectPulseStyle() {
  if (document.getElementById('maestraai-style')) return
  const style = document.createElement('style')
  style.id = 'maestraai-style'
  style.textContent = `
    @keyframes maestraai-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,.5), 0 2px 8px rgba(0,0,0,.18); }
      50% { box-shadow: 0 0 0 6px rgba(245,158,11,0), 0 2px 8px rgba(0,0,0,.18); }
    }
    @keyframes maestraai-dot-pulse {
      0%,100% { opacity:1; }
      50% { opacity:.3; }
    }
  `
  document.head.appendChild(style)
}

function ensureBadge() {
  if (badge) return badge
  injectPulseStyle()
  badge = document.createElement('div')
  badge.id = 'maestraai-badge'
  badge.style.cssText = [
    'position:fixed', 'top:14px', 'right:14px', 'z-index:2147483647',
    'padding:7px 13px', 'border-radius:22px', 'font-size:13px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'font-weight:700', 'display:flex', 'align-items:center', 'gap:7px',
    'box-shadow:0 2px 8px rgba(0,0,0,.18)',
    'transition:background .3s,color .3s,border-color .3s',
    'pointer-events:none', 'user-select:none', 'border:1.5px solid transparent',
  ].join(';')
  // At document_start <body> may not exist yet; <html> always does.
  ;(document.body || document.documentElement).appendChild(badge)
  return badge
}

// The Richmond group slug for the page currently open, or null when not on a course page.
function currentSlug() {
  const m = window.location.pathname.match(/\/courses\/([^/]+)\//)
  return m ? m[1] : null
}

// Single source of truth for the resting badge state, so every code path agrees.
// Green requires that THIS page's group is linked — not merely that some group is.
// (A green badge while viewing an unlinked group was why data dropped silently.)
function idleBadge() {
  const slug = currentSlug()
  const total = Object.keys(GROUP_UUID_MAP).length
  if (total === 0) return { state: 'amber', text: '⚠ MaestraAI sin vincular' }
  if (slug && !GROUP_UUID_MAP[slug])
    return { state: 'amber', text: '⚠ Este grupo no está vinculado → clic en el ícono ↗' }
  return { state: 'green', text: 'MaestraAI ✓' }
}

const BADGE_STYLES = {
  gray:  { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af', border: '#e5e7eb',   pulse: false },
  green: { bg: '#ecfdf5', color: '#166534', dot: '#22c55e', border: '#86efac',   pulse: false },
  amber: { bg: '#fffbeb', color: '#7c2d12', dot: '#f59e0b', border: '#fcd34d',   pulse: true  },
  red:   { bg: '#fef2f2', color: '#991b1b', dot: '#ef4444', border: '#fca5a5',   pulse: false },
}

function setBadge(state, text) {
  const el = ensureBadge()
  const s = BADGE_STYLES[state] || BADGE_STYLES.gray
  el.style.background = s.bg
  el.style.color = s.color
  el.style.borderColor = s.border
  el.style.animation = s.pulse ? 'maestraai-pulse 1.6s ease-in-out infinite' : 'none'
  el.replaceChildren()

  const dot = document.createElement('span')
  dot.style.cssText = [
    `width:8px`, `height:8px`, `border-radius:50%`, `background:${s.dot}`,
    `display:inline-block`, `flex-shrink:0`,
    s.pulse ? 'animation:maestraai-dot-pulse 1.6s ease-in-out infinite' : '',
  ].join(';')
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

// Returns false when the extension was reloaded/updated while this tab was open.
// In that state all chrome.runtime calls throw — the only recovery is a page reload.
function isContextValid() {
  try { return !!chrome.runtime?.id } catch { return false }
}

let loadRetryTimer = null

async function loadGroupMappings() {
  if (!isContextValid()) {
    setBadge('amber', '⚠ MaestraAI · Recarga la página')
    console.warn('[MaestraAI] Extension context invalidated — reload the page to re-activate')
    return
  }
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
      try {
        chrome.runtime.sendMessage({ type: 'FETCH_GROUPS', apiKey, apiUrl }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[MaestraAI] Service worker inactive:', chrome.runtime.lastError.message)
            resolve({ ok: false, error: 'service_worker_inactive' })
          } else {
            resolve(response)
          }
        })
      } catch (err) {
        resolve({ ok: false, error: err.message })
      }
    })

    if (!result?.ok) {
      console.error('[MaestraAI] Failed to load groups:', result?.statusCode, result?.error)
      if (result?.error === 'service_worker_inactive') {
        // MV3 service worker was killed by Chrome — it wakes on next message, retry shortly.
        setBadge('amber', 'MaestraAI · Reintentando...')
        clearTimeout(loadRetryTimer)
        loadRetryTimer = setTimeout(loadGroupMappings, 3000)
      } else {
        setBadge('red', 'MaestraAI · Error de conexión')
      }
      return
    }

    clearTimeout(loadRetryTimer)
    GROUP_UUID_MAP = result.data.groupMap || {}
    isInitialized = true

    // Resting badge: green only if THIS page's group is linked, amber otherwise.
    const idle = idleBadge()
    setBadge(idle.state, idle.text)
    if (idle.state === 'amber') {
      console.warn('[MaestraAI]', idle.text, '— current slug:', currentSlug(), 'known:', Object.keys(GROUP_UUID_MAP))
    }

    if (pendingPayloads.length > 0) {
      pendingPayloads.splice(0).forEach(({ groupSlug, data }) => {
        sendToBackground(groupSlug, data)
      })
    }
  } catch (error) {
    const msg = String(error)
    if (msg.includes('context invalidated') || msg.includes('Extension context')) {
      setBadge('amber', '⚠ MaestraAI · Recarga la página')
      console.warn('[MaestraAI] Extension context invalidated:', error)
    } else {
      console.error('[MaestraAI] Failed to load group mappings:', error)
      setBadge('red', 'MaestraAI · Error')
    }
  }
}

function sendToBackground(groupSlug, data) {
  const groupId = GROUP_UUID_MAP[groupSlug]
  if (!groupId) {
    // Data arrived for a group that was never linked — surface it instead of dropping silently.
    setBadge('amber', '⚠ Grupo no vinculado → clic en el ícono ↗')
    console.warn('[MaestraAI] No mapping for Richmond slug:', groupSlug, '— known slugs:', Object.keys(GROUP_UUID_MAP), '→ link this group in the popup.')
    return
  }
  if (!Array.isArray(data) || data.length === 0) return
  if (!isContextValid()) {
    setBadge('amber', '⚠ MaestraAI · Recarga la página')
    console.warn('[MaestraAI] Extension context invalidated — reload the page to re-activate')
    return
  }
  setBadge('gray', 'MaestraAI · Sincronizando...')
  try {
    chrome.runtime.sendMessage({ type: 'ASSIGNMENT_SCORES_INTERCEPTED', groupId, groupSlug, data })
  } catch (err) {
    const msg = String(err)
    if (msg.includes('context invalidated') || msg.includes('Extension context')) {
      setBadge('amber', '⚠ MaestraAI · Recarga la página')
      console.warn('[MaestraAI] Extension context invalidated — reload the page to re-activate')
    } else {
      setBadge('red', 'MaestraAI · Error al enviar datos')
      console.error('[MaestraAI] sendMessage failed:', err)
    }
  }
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
    const idle = idleBadge()
    if (message.status === 'ok') {
      const label = message.count != null ? `MaestraAI ✓ ${message.count} registros` : 'MaestraAI ✓ Sincronizado'
      setBadgeTemp('green', label, idle.state, idle.text)
    } else {
      // Reset to the real resting state (green/amber), not an unconditional green.
      setBadgeTemp('red', 'MaestraAI · Error al sincronizar', idle.state, idle.text)
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
